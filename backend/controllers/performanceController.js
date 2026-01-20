const { PerformanceReview, Employee, User } = require('../models');
const { Op } = require('sequelize');

const getReviews = async (req, res) => {
  try {
    const reviews = await PerformanceReview.findAll({
      include: [
        {
          model: Employee,
          attributes: ['employee_id', 'first_name', 'last_name', 'designation'],
        },
        {
          model: User,
          as: 'Reviewer',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
      order: [['review_date', 'DESC']],
    });

    res.status(200).json(reviews);
  } catch (err) {
    console.error('Error fetching performance reviews:', err);
    res.status(500).json({ message: 'Failed to fetch performance reviews' });
  }
};

const addReview = async (req, res) => {
  const { employee_id, rating, feedback, review_month } = req.body;

  const reviewer_id = req.user?.id;

  if (!reviewer_id) {
    return res.status(401).json({ message: 'Unauthorized - please log in' });
  }

  // Basic validation
  if (!employee_id) {
    return res.status(400).json({ message: 'employee_id is required' });
  }

  if (!review_month || !/^\d{4}-\d{2}$/.test(review_month)) {
    return res.status(400).json({ 
      message: 'review_month is required and must be in YYYY-MM format (e.g. 2025-01)' 
    });
  }

  const parsedRating = Number(rating);
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
  }

  if (!feedback || typeof feedback !== 'string' || feedback.trim() === '') {
    return res.status(400).json({ message: 'Feedback is required and cannot be empty' });
  }

  try {
    // Prevent duplicate review from the same reviewer for the same employee in the same month
    const existing = await PerformanceReview.findOne({
      where: {
        employee_id,
        reviewer_id,
        review_month,           // ← key change: now includes month
      },
    });

    if (existing) {
      return res.status(400).json({
        message: 'You have already submitted a review for this employee in this month',
      });
    }

    const review = await PerformanceReview.create({
      employee_id,
      reviewer_id,
      rating: parsedRating,
      feedback: feedback.trim(),
      review_date: new Date(),
      review_month,             // ← store the month
    });

    // Return enhanced object
    const createdReview = await PerformanceReview.findByPk(review.review_id, {
      include: [
        {
          model: Employee,
          attributes: ['first_name', 'last_name', 'designation'],
        },
        {
          model: User,
          as: 'Reviewer',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
    });

    res.status(201).json({
      message: 'Performance review created successfully',
      review: createdReview,
    });
  } catch (err) {
    console.error('Error creating performance review:', err);
    res.status(500).json({ message: 'Failed to create performance review' });
  }
};

const updateReview = async (req, res) => {
  const { rating, feedback } = req.body;
  const reviewId = req.params.id;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const review = await PerformanceReview.findByPk(reviewId, {
      include: [{ model: User, as: 'Reviewer' }],
    });

    if (!review) {
      return res.status(404).json({ message: 'Performance review not found' });
    }

    // Authorization: only the original reviewer or admin can update
    const isAdmin = req.user.role === 'admin'; // adjust based on your role field
    if (review.reviewer_id !== currentUserId && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to update this review' });
    }

    let hasChanges = false;

    if (rating !== undefined) {
      const parsedRating = Number(rating);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = parsedRating;
      hasChanges = true;
    }

    if (feedback !== undefined) {
      if (typeof feedback !== 'string' || feedback.trim() === '') {
        return res.status(400).json({ message: 'Feedback cannot be empty' });
      }
      review.feedback = feedback.trim();
      hasChanges = true;
    }

    if (!hasChanges) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    await review.save();

    const updatedReview = await PerformanceReview.findByPk(reviewId, {
      include: [
        {
          model: Employee,
          attributes: ['first_name', 'last_name', 'designation'],
        },
        {
          model: User,
          as: 'Reviewer',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
    });

    res.json({
      message: 'Performance review updated successfully',
      review: updatedReview,
    });
  } catch (err) {
    console.error('Error updating performance review:', err);
    res.status(500).json({ message: 'Failed to update performance review' });
  }
};

const deleteReview = async (req, res) => {
  const reviewId = req.params.id;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const review = await PerformanceReview.findByPk(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Performance review not found' });
    }

    // Authorization: only the reviewer or admin can delete
    const isAdmin = req.user.role === 'admin'; // adjust based on your role field
    if (review.reviewer_id !== currentUserId && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this review' });
    }

    await review.destroy();

    res.json({ message: 'Performance review deleted successfully' });
  } catch (err) {
    console.error('Error deleting performance review:', err);
    res.status(500).json({ message: 'Failed to delete performance review' });
  }
};

module.exports = {
  getReviews,
  addReview,
  updateReview,
  deleteReview,
};