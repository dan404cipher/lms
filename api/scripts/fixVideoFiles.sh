#!/bin/bash

# Script to fix MP4 files for web browser compatibility
# This moves the moov atom to the beginning of the file for streaming

RECORDINGS_DIR="../recordings"
BACKUP_DIR="../recordings_backup"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔧 Fixing video files for web browser compatibility..."
echo "📁 Processing directory: $RECORDINGS_DIR"
echo ""

# Counter
total=0
fixed=0
failed=0

# Process all MP4 files
for video in "$RECORDINGS_DIR"/*.mp4; do
    if [ -f "$video" ]; then
        total=$((total + 1))
        filename=$(basename "$video")
        backup_file="$BACKUP_DIR/$filename"
        temp_file="$RECORDINGS_DIR/${filename}.temp.mp4"
        
        echo "📹 Processing: $filename"
        
        # Backup original
        cp "$video" "$backup_file"
        echo "   ✅ Backed up to: $backup_file"
        
        # Fix the video using ffmpeg's faststart flag
        # This moves the moov atom to the beginning without re-encoding
        if ffmpeg -i "$video" -c copy -movflags +faststart "$temp_file" -y 2>/dev/null; then
            mv "$temp_file" "$video"
            fixed=$((fixed + 1))
            
            # Get file sizes
            original_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
            new_size=$(stat -f%z "$video" 2>/dev/null || stat -c%s "$video" 2>/dev/null)
            
            echo "   ✅ Fixed! (Original: $(numfmt --to=iec $original_size 2>/dev/null || echo "${original_size} bytes"), New: $(numfmt --to=iec $new_size 2>/dev/null || echo "${new_size} bytes"))"
        else
            # If copy fails, try re-encoding with web-compatible settings
            echo "   ⚠️  Copy failed, trying re-encode..."
            if ffmpeg -i "$video" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 128k -movflags +faststart "$temp_file" -y 2>/dev/null; then
                mv "$temp_file" "$video"
                fixed=$((fixed + 1))
                echo "   ✅ Re-encoded successfully!"
            else
                failed=$((failed + 1))
                rm -f "$temp_file"
                echo "   ❌ Failed to fix this video"
            fi
        fi
        echo ""
    fi
done

echo "📊 Summary:"
echo "   Total videos: $total"
echo "   ✅ Fixed: $fixed"
echo "   ❌ Failed: $failed"
echo ""
echo "💾 Original files backed up to: $BACKUP_DIR"
echo ""

if [ $fixed -gt 0 ]; then
    echo "✨ Done! Your videos should now play in web browsers."
else
    echo "⚠️  No videos were fixed. Check if ffmpeg is installed."
fi

