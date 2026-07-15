'use strict';
const crypto = require('node:crypto');
const { Op } = require('sequelize');
const { CampaignDrop, CampaignDropPuzzle, Enrollment, SquadPuzzleCompletion } = require('../models');
const { sequelize } = require('../config/database');
const { NotFoundError, AppError } = require('../utils/errors');

const CAESAR_DEFAULT_SHIFT = 13;
const HASH_ALGORITHMS = ['md5', 'sha1', 'sha256'];

// Pure, per-type config shaping — strips unknown keys, applies type defaults.
function normalizePuzzleConfig(puzzleType, config = {}) {
  const raw = config && typeof config === 'object' ? config : {};
  if (puzzleType === 'signal_hunt') return { signalCode: String(raw.signalCode ?? '') };
  if (puzzleType === 'vault_lock') return {};
  if (puzzleType === 'cipher_wheel') {
    const method = ['caesar', 'rot13', 'atbash'].includes(raw.method) ? raw.method : 'caesar';
    const rawShift = Math.trunc(Number(raw.shift));
    const shift = method === 'caesar'
      ? Math.min(25, Math.max(1, Number.isFinite(rawShift) ? rawShift : CAESAR_DEFAULT_SHIFT))
      : undefined;
    return { cipherText: String(raw.cipherText ?? ''), method, ...(shift !== undefined ? { shift } : {}) };
  }
  if (puzzleType === 'log_grep') {
    const lineFormat = ['auth', 'firewall', 'vpn'].includes(raw.lineFormat) ? raw.lineFormat : 'auth';
    const logLines = Array.isArray(raw.logLines) ? raw.logLines.map(String) : [];
    return { logLines, lineFormat };
  }
  if (puzzleType === 'hash_match') {
    const algorithm = HASH_ALGORITHMS.includes(raw.algorithm) ? raw.algorithm : 'sha256';
    return { inputText: String(raw.inputText ?? ''), algorithm };
  }

  return raw;
}

// Service-layer defense-in-depth mirroring assertCompleteVaultConfig — but
// actually covers every type (Signal Hunt today has no such check at all).
function assertCompletePuzzleConfig(puzzleType, data) {
  const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';
  const answer = typeof data.answer === 'string' ? data.answer.trim() : '';
  const config = data.config ?? {};

  if (puzzleType === 'hash_match') {
    if (answer) {
      throw new AppError('hash_match puzzles must not set a stored answer — it is computed from config.inputText/config.algorithm', 400, 'VALIDATION_ERROR');
    }
    if (!config.inputText || !String(config.inputText).trim()) {
      throw new AppError('hash_match puzzles require config.inputText', 400, 'VALIDATION_ERROR');
    }
    if (!HASH_ALGORITHMS.includes(config.algorithm)) {
      throw new AppError(`hash_match puzzles require config.algorithm to be one of ${HASH_ALGORITHMS.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
    return;
  }

  if (puzzleType === 'signal_hunt') {
    if (!prompt) throw new AppError('signal_hunt games require a prompt', 400, 'VALIDATION_ERROR');
    if (!answer) throw new AppError('signal_hunt games require an answer', 400, 'VALIDATION_ERROR');
    if (!config.signalCode || !String(config.signalCode).trim()) throw new AppError('signal_hunt games require config.signalCode', 400, 'VALIDATION_ERROR');
    return;
  }

  if (puzzleType === 'vault_lock') {
    if (!prompt) throw new AppError('vault_lock games require instructions', 400, 'VALIDATION_ERROR');
    if (!answer) throw new AppError('vault_lock games require an answer', 400, 'VALIDATION_ERROR');
    return;
  }

  if (puzzleType === 'cipher_wheel' || puzzleType === 'log_grep') {
    if (!prompt) throw new AppError(`${puzzleType} puzzles require a prompt`, 400, 'VALIDATION_ERROR');
    if (!answer) throw new AppError(`${puzzleType} puzzles require an answer`, 400, 'VALIDATION_ERROR');
    if (puzzleType === 'cipher_wheel' && (!config.cipherText || !String(config.cipherText).trim())) {
      throw new AppError('cipher_wheel puzzles require config.cipherText', 400, 'VALIDATION_ERROR');
    }
    if (puzzleType === 'log_grep' && (!Array.isArray(config.logLines) || config.logLines.length === 0)) {
      throw new AppError('log_grep puzzles require a non-empty config.logLines array', 400, 'VALIDATION_ERROR');
    }
    return;
  }

  throw new AppError(`Unknown puzzle_type: ${puzzleType}`, 400, 'VALIDATION_ERROR');
}

// Batched fetch to avoid N+1 when listDrops attaches puzzles to every drop.
async function listPuzzlesForDrops(dropIds, { includeAnswers = false } = {}) {
  const byDrop = new Map(dropIds.map((id) => [id, []]));
  if (dropIds.length === 0) return byDrop;

  const puzzles = await CampaignDropPuzzle.findAll({
    where: { drop_id: { [Op.in]: dropIds } },
    order: [['order_index', 'ASC']],
  });
  for (const puzzle of puzzles) {
    const json = puzzle.toJSON();
    if (!includeAnswers) delete json.answer;
    byDrop.get(json.drop_id)?.push(json);
  }
  return byDrop;
}

async function listPuzzlesForDrop(dropId, opts) {
  const byDrop = await listPuzzlesForDrops([dropId], opts);
  return byDrop.get(dropId) ?? [];
}

async function createPuzzle(dropId, data) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');

  assertCompletePuzzleConfig(data.puzzle_type, data);
  const config = normalizePuzzleConfig(data.puzzle_type, data.config);

  let orderIndex = data.order_index;
  if (orderIndex == null) {
    const max = await CampaignDropPuzzle.max('order_index', { where: { drop_id: dropId } });
    orderIndex = (max ?? -1) + 1;
  }

  return CampaignDropPuzzle.create({
    drop_id: dropId,
    puzzle_type: data.puzzle_type,
    order_index: orderIndex,
    enabled: data.enabled ?? true,
    prompt: data.prompt ?? null,
    answer: data.answer ?? null,
    config,
  });
}

async function findPuzzleForDrop(dropId, puzzleId) {
  const puzzle = await CampaignDropPuzzle.findOne({ where: { id: puzzleId, drop_id: dropId } });
  if (!puzzle) throw new NotFoundError('CampaignDropPuzzle');
  return puzzle;
}

async function updatePuzzle(dropId, puzzleId, data) {
  const puzzle = await findPuzzleForDrop(dropId, puzzleId);

  const merged = {
    puzzle_type: Object.hasOwn(data, 'puzzle_type') ? data.puzzle_type : puzzle.puzzle_type,
    prompt: Object.hasOwn(data, 'prompt') ? data.prompt : puzzle.prompt,
    answer: Object.hasOwn(data, 'answer') ? data.answer : puzzle.answer,
    config: Object.hasOwn(data, 'config') ? data.config : puzzle.config,
  };
  assertCompletePuzzleConfig(merged.puzzle_type, merged);

  const patch = { ...data };
  if (Object.hasOwn(patch, 'config') || Object.hasOwn(patch, 'puzzle_type')) {
    patch.config = normalizePuzzleConfig(merged.puzzle_type, merged.config);
  }
  return puzzle.update(patch);
}

async function deletePuzzle(dropId, puzzleId) {
  const puzzle = await findPuzzleForDrop(dropId, puzzleId);
  await puzzle.destroy();
}

async function reorderPuzzles(dropId, orderedIds) {
  const puzzles = await CampaignDropPuzzle.findAll({ where: { drop_id: dropId } });
  const validIds = new Set(puzzles.map((p) => p.id));
  if (orderedIds.length !== validIds.size || new Set(orderedIds).size !== orderedIds.length || !orderedIds.every((id) => validIds.has(id))) {
    throw new AppError('ordered_ids must contain every puzzle for this drop exactly once', 400, 'VALIDATION_ERROR');
  }
  await Promise.all(orderedIds.map((id, index) =>
    CampaignDropPuzzle.update({ order_index: index }, { where: { id } })
  ));
  return listPuzzlesForDrop(dropId, { includeAnswers: true });
}

async function verifyPuzzleAnswer(dropId, puzzleId, submitted) {
  const puzzle = await findPuzzleForDrop(dropId, puzzleId);
  if (!puzzle.enabled) return { valid: false };

  const entered = String(submitted ?? '').trim().toLowerCase();

  if (puzzle.puzzle_type === 'hash_match') {
    const { inputText, algorithm } = puzzle.config ?? {};
    const digest = crypto.createHash(algorithm).update(String(inputText ?? ''), 'utf8').digest('hex');
    return { valid: digest.toLowerCase() === entered };
  }

  if (!puzzle.answer) return { valid: false };
  return { valid: puzzle.answer.trim().toLowerCase() === entered };
}

async function completeForSquad(dropId, puzzleId, userId) {
  const puzzle = await findPuzzleForDrop(dropId, puzzleId);
  const drop = await CampaignDrop.findByPk(dropId);
  const enrollment = await Enrollment.findOne({
    where: { user_id: userId, course_id: drop.course_id, status: 'active' },
    attributes: ['squad_id'],
  });
  if (!enrollment?.squad_id) return { scope: 'personal', completed_puzzle_ids: [puzzle.id], first_solver: false, points_awarded: 0 };

  const { completion, created } = await sequelize.transaction(async (transaction) => {
    const [row, wasCreated] = await SquadPuzzleCompletion.findOrCreate({
      where: { squad_id: enrollment.squad_id, puzzle_id: puzzle.id },
      defaults: {
        course_id: drop.course_id, drop_id: drop.id, first_solver_id: userId,
        points_awarded: 10, solved_at: new Date(),
      },
      transaction,
    });
    return { completion: row, created: wasCreated };
  });

  const completed = await SquadPuzzleCompletion.findAll({
    where: { squad_id: enrollment.squad_id, drop_id: drop.id }, attributes: ['puzzle_id'],
  });
  return {
    event: created ? 'squad.decryption.completed' : null,
    scope: 'squad', squad_id: enrollment.squad_id,
    completed_puzzle_ids: completed.map((row) => row.puzzle_id),
    first_solver: created && completion.first_solver_id === userId,
    points_awarded: created && completion.first_solver_id === userId ? completion.points_awarded : 0,
  };
}

async function getSquadCompletion(dropId, userId) {
  const drop = await CampaignDrop.findByPk(dropId);
  if (!drop) throw new NotFoundError('CampaignDrop');
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: drop.course_id, status: 'active' }, attributes: ['squad_id'] });
  if (!enrollment?.squad_id) return { scope: 'personal', completed_puzzle_ids: [] };
  const rows = await SquadPuzzleCompletion.findAll({ where: { squad_id: enrollment.squad_id, drop_id: drop.id }, attributes: ['puzzle_id'] });
  return { scope: 'squad', squad_id: enrollment.squad_id, completed_puzzle_ids: rows.map((row) => row.puzzle_id) };
}

module.exports = {
  normalizePuzzleConfig,
  assertCompletePuzzleConfig,
  findPuzzleForDrop,
  listPuzzlesForDrops,
  listPuzzlesForDrop,
  createPuzzle,
  updatePuzzle,
  deletePuzzle,
  reorderPuzzles,
  verifyPuzzleAnswer,
  completeForSquad,
  getSquadCompletion,
};
