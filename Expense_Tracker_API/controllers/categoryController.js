const mongoose = require('mongoose');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

// Get all categories for the logged-in user
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user._id }).sort({ createdAt: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};    

// Create a custom category
exports.createCategory = async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    if (color && !COLOR_REGEX.test(color)) {
      return res.status(400).json({ message: 'Color must look like #3b82f6' });
    }

    const category = await Category.create({
      user: req.user._id,
      name,
      color: color || undefined,
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You already have a category with this name' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Rename or recolor a custom category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const category = await Category.findOne({ _id: id, user: req.user._id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    if (category.isDefault) {
      return res.status(403).json({ message: 'Default categories cannot be changed' });
    }

    const { name, color } = req.body;

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: 'Category name cannot be empty' });
      }
      category.name = name;
    }
    if (color !== undefined) {
      if (!COLOR_REGEX.test(color)) {
        return res.status(400).json({ message: 'Color must look like #3b82f6' });
      }
      category.color = color;
    }

    await category.save();
    res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You already have a category with this name' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a custom category and move its transactions to "Other"
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const category = await Category.findOne({ _id: id, user: req.user._id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    if (category.isDefault) {
      return res.status(403).json({ message: 'Default categories cannot be deleted' });
    }

    const other = await Category.findOne({
      user: req.user._id,
      name: 'Other',
      isDefault: true,
    });
    if (!other) {
      return res.status(500).json({ message: 'The default "Other" category is missing' });
    }

    await Transaction.updateMany(
      { user: req.user._id, category: category._id },
      { category: other._id }
    );
    await Budget.deleteOne({ user: req.user._id, category: category._id });
    await category.deleteOne();

    res.json({ message: 'Category deleted. Its transactions were moved to Other.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};