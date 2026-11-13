const express = require('express');

class CreditAnalystController {
  async index(req, res, next) {
    try {
      return res.json({ success: true, message: 'Resource list retrieved', data: [] });
    } catch (err) {
      next(err);
    }
  }

  async show(req, res, next) {
    try {
      return res.json({ success: true, message: 'Resource retrieved', data: { id: req.params.id } });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      return res.status(201).json({ success: true, message: 'Resource created', data: req.body });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      return res.json({ success: true, message: 'Resource updated', data: { id: req.params.id, ...req.body } });
    } catch (err) {
      next(err);
    }
  }

  async destroy(req, res, next) {
    try {
      return res.json({ success: true, message: 'Resource deleted', id: req.params.id });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CreditAnalystController();
