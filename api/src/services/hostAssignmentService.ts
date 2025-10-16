import { ZoomHost, IZoomHost } from '../models/ZoomHost';
import { Session } from '../models/Session';

/**
 * Host Assignment Service
 * Manages intelligent assignment of Zoom hosts to sessions
 * Ensures no single Zoom Pro account exceeds its concurrent meeting limit
 */
class HostAssignmentService {
  /**
   * Get an available Zoom host for a new meeting
   * Prioritizes hosts by:
   * 1. Availability (not at max concurrent meetings)
   * 2. Priority score
   * 3. Least recently used
   */
  async getAvailableHost(): Promise<IZoomHost | null> {
    try {
      console.log('🔍 Finding available Zoom host...');

      // First, get ALL hosts to see what's in the database
      const allHosts = await ZoomHost.find();
      console.log('\n📋 ALL ZOOM HOSTS IN DATABASE:');
      console.log(`Total hosts found: ${allHosts.length}`);
      
      if (allHosts.length === 0) {
        console.error('❌ NO ZOOM HOSTS IN DATABASE!');
        console.log('💡 Please run the initializeZoomHosts script first:');
        console.log('   npx ts-node scripts/initializeZoomHosts.ts');
        return null;
      }

      allHosts.forEach((host, index) => {
        console.log(`\n--- Host #${index + 1} ---`);
        console.log(`Email: ${host.email}`);
        console.log(`Display Name: ${host.displayName}`);
        console.log(`Is Active: ${host.isActive}`);
        console.log(`Is Primary: ${host.isPrimary}`);
        console.log(`Current Meetings: ${host.currentMeetings}`);
        console.log(`Max Concurrent Meetings: ${host.maxConcurrentMeetings}`);
        console.log(`Can Host Meeting: ${host.canHostMeeting()}`);
        console.log(`Priority: ${host.priority}`);
      });

      // Find all active hosts that can accept more meetings
      const availableHosts = await ZoomHost.find({
        isActive: true,
        $expr: { $lt: ['$currentMeetings', '$maxConcurrentMeetings'] }
      })
      .sort({ 
        priority: -1, // Higher priority first
        currentMeetings: 1, // Least busy first
        'metadata.lastUsed': 1 // Least recently used first
      });

      console.log(`\n✅ Available hosts that can accept meetings: ${availableHosts.length}`);

      if (availableHosts.length === 0) {
        console.error('\n❌ No available Zoom hosts found!');
        console.log('💡 Reasons could be:');
        console.log('   1. All hosts are inactive (isActive: false)');
        console.log('   2. All hosts are at max concurrent meetings');
        console.log('   3. No hosts are configured in the database');
        
        // Show why each host is not available
        console.log('\n🔍 Checking why each host is unavailable:');
        allHosts.forEach((host) => {
          if (!host.isActive) {
            console.log(`   ❌ ${host.email}: INACTIVE`);
          } else if (host.currentMeetings >= host.maxConcurrentMeetings) {
            console.log(`   ❌ ${host.email}: AT MAX CAPACITY (${host.currentMeetings}/${host.maxConcurrentMeetings})`);
          }
        });
        
        return null;
      }

      const selectedHost = availableHosts[0];
      if (!selectedHost) {
        console.error('❌ No available Zoom hosts found!');
        return null;
      }
      
      console.log(`\n✅ Selected Zoom host: ${selectedHost.email}`);
      console.log(`   Display Name: ${selectedHost.displayName}`);
      console.log(`   Current meetings: ${selectedHost.currentMeetings}/${selectedHost.maxConcurrentMeetings}`);
      console.log(`   Priority: ${selectedHost.priority}`);
      
      return selectedHost;
    } catch (error) {
      console.error('Error finding available host:', error);
      return null;
    }
  }

  /**
   * Get a specific host by email
   */
  async getHostByEmail(email: string): Promise<IZoomHost | null> {
    try {
      const host = await ZoomHost.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
      });
      
      if (!host) {
        console.warn(`⚠️ Zoom host not found: ${email}`);
        return null;
      }

      return host;
    } catch (error) {
      console.error('Error finding host by email:', error);
      return null;
    }
  }

  /**
   * Assign a host to a session when it's created
   */
  async assignHostToSession(sessionId: string, preferredHostEmail?: string): Promise<IZoomHost | null> {
    try {
      console.log('\n🎯 ===== ASSIGNING ZOOM HOST TO SESSION =====');
      console.log(`Session ID: ${sessionId}`);
      console.log(`Preferred Host Email: ${preferredHostEmail || 'None specified'}`);
      
      let host: IZoomHost | null = null;

      // Try to use preferred host if specified and available
      if (preferredHostEmail) {
        console.log(`\n🔍 Checking preferred host: ${preferredHostEmail}`);
        host = await this.getHostByEmail(preferredHostEmail);
        
        if (host) {
          console.log(`✅ Preferred host found: ${host.email}`);
          console.log(`   Display Name: ${host.displayName}`);
          console.log(`   Current Meetings: ${host.currentMeetings}/${host.maxConcurrentMeetings}`);
          console.log(`   Can Host Meeting: ${host.canHostMeeting()}`);
          
          if (!host.canHostMeeting()) {
            console.warn(`⚠️ Preferred host ${preferredHostEmail} is at capacity, finding alternative...`);
            host = null;
          }
        } else {
          console.warn(`⚠️ Preferred host ${preferredHostEmail} not found in database`);
        }
      }

      // If no preferred host or preferred host unavailable, get any available host
      if (!host) {
        console.log('\n🔍 Finding any available Zoom host...');
        host = await this.getAvailableHost();
      }

      if (!host) {
        console.error('\n❌ FAILED TO ASSIGN HOST - No available Zoom hosts');
        throw new Error('No available Zoom hosts. All accounts are currently hosting meetings.');
      }

      // Increment the host's meeting count
      console.log(`\n📈 Incrementing meeting count for: ${host.email}`);
      console.log(`   Before: ${host.currentMeetings}/${host.maxConcurrentMeetings}`);
      
      await host.incrementMeetings();
      
      console.log(`   After: ${host.currentMeetings}/${host.maxConcurrentMeetings}`);
      console.log(`\n✅ Successfully assigned host: ${host.email}`);
      console.log('🎯 ===== HOST ASSIGNMENT COMPLETE =====\n');

      return host;
    } catch (error) {
      console.error('\n❌ Error assigning host to session:', error);
      console.log('🎯 ===== HOST ASSIGNMENT FAILED =====\n');
      throw error;
    }
  }

  /**
   * Release a host when a session ends
   */
  async releaseHost(hostEmail: string): Promise<void> {
    try {
      const host = await ZoomHost.findOne({ email: hostEmail.toLowerCase() });
      
      if (!host) {
        console.warn(`⚠️ Could not find host to release: ${hostEmail}`);
        return;
      }

      await host.decrementMeetings();
      console.log(`📊 Host ${host.email} released. Now hosting ${host.currentMeetings}/${host.maxConcurrentMeetings} meetings`);
    } catch (error) {
      console.error('Error releasing host:', error);
    }
  }

  /**
   * Get all hosts with their current status
   */
  async getAllHostsStatus(): Promise<IZoomHost[]> {
    try {
      const hosts = await ZoomHost.find().sort({ priority: -1 });
      return hosts;
    } catch (error) {
      console.error('Error getting all hosts status:', error);
      return [];
    }
  }

  /**
   * Sync host meeting counts with actual active sessions
   * Use this to fix any inconsistencies
   */
  async syncHostMeetingCounts(): Promise<void> {
    try {
      console.log('🔄 Syncing host meeting counts with active sessions...');

      const hosts = await ZoomHost.find();
      
      for (const host of hosts) {
        // Count actual active/live sessions using this host
        const activeSessionCount = await Session.countDocuments({
          zoomHostEmail: host.email,
          status: { $in: ['scheduled', 'live'] },
          scheduledAt: { $lte: new Date() },
          $expr: {
            $gte: [
              { $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] },
              new Date()
            ]
          }
        });

        if (host.currentMeetings !== activeSessionCount) {
          console.log(`📊 Correcting ${host.email}: ${host.currentMeetings} -> ${activeSessionCount}`);
          host.currentMeetings = activeSessionCount;
          await host.save();
        }
      }

      console.log('✅ Host meeting counts synced');
    } catch (error) {
      console.error('Error syncing host meeting counts:', error);
    }
  }

  /**
   * Check if a specific instructor's preferred Zoom email is available
   * If not, suggest next available time
   */
  async checkHostAvailability(hostEmail: string, startTime: Date, duration: number): Promise<{
    available: boolean;
    conflictingSessions?: any[];
    nextAvailableTime?: Date;
  }> {
    try {
      const host = await this.getHostByEmail(hostEmail);
      
      if (!host) {
        return { available: false };
      }

      // Check for overlapping sessions
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      const conflictingSessions = await Session.find({
        zoomHostEmail: hostEmail,
        status: { $in: ['scheduled', 'live'] },
        $or: [
          // Session starts during this meeting
          {
            scheduledAt: { $gte: startTime, $lt: endTime }
          },
          // Session ends during this meeting
          {
            $expr: {
              $and: [
                { $gte: [{ $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] }, startTime] },
                { $lt: [{ $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] }, endTime] }
              ]
            }
          },
          // This meeting is completely within another session
          {
            scheduledAt: { $lte: startTime },
            $expr: {
              $gte: [{ $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] }, endTime]
            }
          }
        ]
      }).sort({ scheduledAt: 1 });

      if (conflictingSessions.length > 0) {
        // Find next available time after the last conflicting session
        const lastConflict = conflictingSessions[conflictingSessions.length - 1];
        if (!lastConflict) {
          return { available: false };
        }
        
        const nextAvailableTime = new Date(
          new Date(lastConflict.scheduledAt).getTime() + lastConflict.duration * 60000
        );

        return {
          available: false,
          conflictingSessions,
          nextAvailableTime
        };
      }

      return { available: true };
    } catch (error) {
      console.error('Error checking host availability:', error);
      return { available: false };
    }
  }
}

export default new HostAssignmentService();

