'use strict';
const { ContentItem, Module } = require('../models');
const { NotFoundError }       = require('../utils/errors');

async function list(req, res, next) {
  try {
    const items = await ContentItem.findAll({
      where: { module_id: req.params.mid },
      order: [['order_index', 'ASC']],
    });
    return res.json(items);
  } catch (err) { return next(err); }
}

async function create(req, res, next) {
  try {
    const mod = await Module.findByPk(req.params.mid);
    if (!mod) throw new NotFoundError('Module');
    const item = await ContentItem.create({ ...req.body, module_id: req.params.mid });
    return res.status(201).json(item);
  } catch (err) { return next(err); }
}

async function update(req, res, next) {
  try {
    const item = await ContentItem.findByPk(req.params.cid);
    if (!item) throw new NotFoundError('ContentItem');
    await item.update(req.body);
    return res.json(item);
  } catch (err) { return next(err); }
}

async function remove(req, res, next) {
  try {
    const item = await ContentItem.findByPk(req.params.cid);
    if (!item) throw new NotFoundError('ContentItem');
    await item.destroy();
    return res.status(204).send();
  } catch (err) { return next(err); }
}

module.exports = { list, create, update, remove };
