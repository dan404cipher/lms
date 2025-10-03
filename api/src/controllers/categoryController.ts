import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category';

interface AuthRequest extends Request {
  user?: any;
}

// Get all categories
export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select('name description slug icon color');

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
};

// Create category (admin only)
export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, slug, icon, color, order } = req.body;

    const category = new Category({
      name,
      description,
      slug,
      icon,
      color,
      order: order || 0,
      isActive: true
    });

    await category.save();

    res.status(201).json({
      success: true,
      data: { category }
    });
  } catch (error) {
    next(error);
  }
};

// Update category (admin only)
export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params.id;
    
    const category = await Category.findByIdAndUpdate(
      categoryId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    next(error);
  }
};

// Delete category (admin only)
export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params.id;
    
    const category = await Category.findByIdAndDelete(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
