'use strict';
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { r2Client, R2_BUCKET } = require('../config/r2');
const {
  KcrEnvironment,
  KcrVenue,
  KcrRoom,
  KcrArtifact,
  KcrPlacement,
} = require('../models');
const { AppError, NotFoundError } = require('../utils/errors');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function signedFloorPlanUrl(key) {
  if (!key) return null;
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
}

function ensureInstructor(req) {
  const { role } = req.user;
  if (role !== 'admin' && role !== 'superadmin' && role !== 'instructor') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
}

// ── Environments ──────────────────────────────────────────────────────────────

async function listEnvironments(req, res, next) {
  try {
    const envs = await KcrEnvironment.findAll({ order: [['created_at', 'DESC']] });
    return res.json(envs);
  } catch (err) { return next(err); }
}

async function createEnvironment(req, res, next) {
  try {
    ensureInstructor(req);
    const { name, description, course_id } = req.body;
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    const env = await KcrEnvironment.create({ name, description, course_id: course_id || null });
    return res.status(201).json(env);
  } catch (err) { return next(err); }
}

async function updateEnvironment(req, res, next) {
  try {
    ensureInstructor(req);
    const env = await KcrEnvironment.findByPk(req.params.eid);
    if (!env) throw new NotFoundError('Environment not found');
    await env.update(req.body);
    return res.json(env);
  } catch (err) { return next(err); }
}

async function deleteEnvironment(req, res, next) {
  try {
    ensureInstructor(req);
    const env = await KcrEnvironment.findByPk(req.params.eid);
    if (!env) throw new NotFoundError('Environment not found');
    await env.destroy();
    return res.status(204).send();
  } catch (err) { return next(err); }
}

// ── Venues ────────────────────────────────────────────────────────────────────

async function listVenues(req, res, next) {
  try {
    const venues = await KcrVenue.findAll({
      where: { environment_id: req.params.eid },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
      include: [{ model: KcrRoom, as: 'rooms', order: [['sort_order', 'ASC']] }],
    });
    return res.json(venues);
  } catch (err) { return next(err); }
}

async function createVenue(req, res, next) {
  try {
    ensureInstructor(req);
    const { name, address, description, sort_order } = req.body;
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    const venue = await KcrVenue.create({
      environment_id: req.params.eid,
      name, address, description,
      sort_order: sort_order ?? 0,
    });
    return res.status(201).json(venue);
  } catch (err) { return next(err); }
}

async function updateVenue(req, res, next) {
  try {
    ensureInstructor(req);
    const venue = await KcrVenue.findOne({ where: { id: req.params.vid, environment_id: req.params.eid } });
    if (!venue) throw new NotFoundError('Venue not found');
    await venue.update(req.body);
    return res.json(venue);
  } catch (err) { return next(err); }
}

async function deleteVenue(req, res, next) {
  try {
    ensureInstructor(req);
    const venue = await KcrVenue.findOne({ where: { id: req.params.vid, environment_id: req.params.eid } });
    if (!venue) throw new NotFoundError('Venue not found');
    await venue.destroy();
    return res.status(204).send();
  } catch (err) { return next(err); }
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

async function listRooms(req, res, next) {
  try {
    const rooms = await KcrRoom.findAll({
      where: { venue_id: req.params.vid },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    });
    return res.json(rooms);
  } catch (err) { return next(err); }
}

async function createRoom(req, res, next) {
  try {
    ensureInstructor(req);
    const { name, description, sort_order } = req.body;
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    const room = await KcrRoom.create({
      venue_id: req.params.vid,
      name, description,
      sort_order: sort_order ?? 0,
    });
    return res.status(201).json(room);
  } catch (err) { return next(err); }
}

async function updateRoom(req, res, next) {
  try {
    ensureInstructor(req);
    const room = await KcrRoom.findByPk(req.params.rid);
    if (!room) throw new NotFoundError('Room not found');
    await room.update(req.body);
    return res.json(room);
  } catch (err) { return next(err); }
}

async function deleteRoom(req, res, next) {
  try {
    ensureInstructor(req);
    const room = await KcrRoom.findByPk(req.params.rid);
    if (!room) throw new NotFoundError('Room not found');
    if (room.floor_plan_key) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: room.floor_plan_key })).catch(() => {});
    }
    await room.destroy();
    return res.status(204).send();
  } catch (err) { return next(err); }
}

/* Presign an upload URL for a floor plan image */
async function presignFloorPlan(req, res, next) {
  try {
    ensureInstructor(req);
    const { content_type = 'image/png' } = req.body;
    const room = await KcrRoom.findByPk(req.params.rid);
    if (!room) throw new NotFoundError('Room not found');

    const key = `kcr/floor-plans/${req.params.rid}/${uuidv4()}`;
    const url = await getSignedUrl(
      r2Client,
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: content_type }),
      { expiresIn: 600 }
    );
    return res.json({ upload_url: url, key });
  } catch (err) { return next(err); }
}

/* Confirm upload and store the key on the room */
async function confirmFloorPlan(req, res, next) {
  try {
    ensureInstructor(req);
    const { key } = req.body;
    if (!key) throw new AppError('key is required', 400, 'VALIDATION_ERROR');
    const room = await KcrRoom.findByPk(req.params.rid);
    if (!room) throw new NotFoundError('Room not found');

    // delete old floor plan from R2 if different
    if (room.floor_plan_key && room.floor_plan_key !== key) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: room.floor_plan_key })).catch(() => {});
    }
    await room.update({ floor_plan_key: key });
    const floor_plan_url = await signedFloorPlanUrl(key);
    return res.json({ ...room.toJSON(), floor_plan_url });
  } catch (err) { return next(err); }
}

/* Get a signed URL for the floor plan so the client can display it */
async function getFloorPlanUrl(req, res, next) {
  try {
    const room = await KcrRoom.findByPk(req.params.rid);
    if (!room) throw new NotFoundError('Room not found');
    const url = await signedFloorPlanUrl(room.floor_plan_key);
    return res.json({ floor_plan_url: url });
  } catch (err) { return next(err); }
}

// ── Artifacts ─────────────────────────────────────────────────────────────────

async function listArtifacts(req, res, next) {
  try {
    const artifacts = await KcrArtifact.findAll({
      where: { environment_id: req.params.eid },
      order: [['type', 'ASC'], ['name', 'ASC']],
    });
    return res.json(artifacts);
  } catch (err) { return next(err); }
}

async function createArtifact(req, res, next) {
  try {
    ensureInstructor(req);
    const { type, name, description, icon_label, color, metadata } = req.body;
    if (!type || !name) throw new AppError('type and name are required', 400, 'VALIDATION_ERROR');
    const artifact = await KcrArtifact.create({
      environment_id: req.params.eid,
      type, name, description, icon_label, color,
      metadata: metadata ?? {},
    });
    return res.status(201).json(artifact);
  } catch (err) { return next(err); }
}

async function updateArtifact(req, res, next) {
  try {
    ensureInstructor(req);
    const artifact = await KcrArtifact.findOne({ where: { id: req.params.aid, environment_id: req.params.eid } });
    if (!artifact) throw new NotFoundError('Artifact not found');
    await artifact.update(req.body);
    return res.json(artifact);
  } catch (err) { return next(err); }
}

async function deleteArtifact(req, res, next) {
  try {
    ensureInstructor(req);
    const artifact = await KcrArtifact.findOne({ where: { id: req.params.aid, environment_id: req.params.eid } });
    if (!artifact) throw new NotFoundError('Artifact not found');
    await artifact.destroy();
    return res.status(204).send();
  } catch (err) { return next(err); }
}

// ── Placements ────────────────────────────────────────────────────────────────

async function listPlacements(req, res, next) {
  try {
    const placements = await KcrPlacement.findAll({
      where: { room_id: req.params.rid },
      include: [{ model: KcrArtifact, as: 'artifact' }],
    });
    return res.json(placements);
  } catch (err) { return next(err); }
}

async function createPlacement(req, res, next) {
  try {
    ensureInstructor(req);
    const { artifact_id, x_pct, y_pct, notes, rotate_deg } = req.body;
    if (artifact_id == null || x_pct == null || y_pct == null) {
      throw new AppError('artifact_id, x_pct, and y_pct are required', 400, 'VALIDATION_ERROR');
    }
    const placement = await KcrPlacement.create({
      room_id: req.params.rid,
      artifact_id, x_pct, y_pct,
      notes: notes ?? null,
      rotate_deg: rotate_deg ?? 0,
    });
    const withArtifact = await KcrPlacement.findByPk(placement.id, {
      include: [{ model: KcrArtifact, as: 'artifact' }],
    });
    return res.status(201).json(withArtifact);
  } catch (err) { return next(err); }
}

async function updatePlacement(req, res, next) {
  try {
    ensureInstructor(req);
    const placement = await KcrPlacement.findOne({ where: { id: req.params.pid, room_id: req.params.rid } });
    if (!placement) throw new NotFoundError('Placement not found');
    await placement.update(req.body);
    const withArtifact = await KcrPlacement.findByPk(placement.id, {
      include: [{ model: KcrArtifact, as: 'artifact' }],
    });
    return res.json(withArtifact);
  } catch (err) { return next(err); }
}

async function deletePlacement(req, res, next) {
  try {
    ensureInstructor(req);
    const placement = await KcrPlacement.findOne({ where: { id: req.params.pid, room_id: req.params.rid } });
    if (!placement) throw new NotFoundError('Placement not found');
    await placement.destroy();
    return res.status(204).send();
  } catch (err) { return next(err); }
}

module.exports = {
  listEnvironments, createEnvironment, updateEnvironment, deleteEnvironment,
  listVenues, createVenue, updateVenue, deleteVenue,
  listRooms, createRoom, updateRoom, deleteRoom,
  presignFloorPlan, confirmFloorPlan, getFloorPlanUrl,
  listArtifacts, createArtifact, updateArtifact, deleteArtifact,
  listPlacements, createPlacement, updatePlacement, deletePlacement,
};
