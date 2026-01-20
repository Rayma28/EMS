const { PerformanceReview, Employee, User } = require('../models');

const getReviews = async (req, res) => {
  try {
    const reviews = await PerformanceReview.findAll({ include: [Employee, { model: User, as: 'Reviewer' }] });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addReview = async (req, res) => {
  const { employee_id, reviewer_id, rating, feedback } = req.body;
  try {
    const review = await PerformanceReview.create({ employee_id, reviewer_id, rating, feedback });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateReview = async (req, res) => {
  const { rating, feedback } = req.body;
  try {
    const review = await PerformanceReview.findByPk(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    await review.update({ rating, feedback });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getReviews, addReview, updateReview };