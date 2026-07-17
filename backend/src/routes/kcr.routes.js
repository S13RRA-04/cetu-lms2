'use strict';
const { Router } = require('express');
const ctrl       = require('../controllers/kcr.controller');
const { requireAuth, requireInstructor } = require('../middleware/auth');

const router = Router();

// Physical range planning (environments/venues/rooms/artifacts/placements) —
// a facilitator/staging tool with no student-facing consumer anywhere in
// pact-app. The previous comment here ("write operations enforce instructor
// role in the controller") was aspirational, not real — kcr.controller.js
// has no role check anywhere, so any authenticated student could create,
// edit, or delete range environments/rooms/artifact placements. Gating the
// whole router, reads included, since nothing legitimate needs student access.

// Environments
router.get('/',       requireAuth, requireInstructor, ctrl.listEnvironments);
router.post('/',      requireAuth, requireInstructor, ctrl.createEnvironment);
router.put('/:eid',   requireAuth, requireInstructor, ctrl.updateEnvironment);
router.delete('/:eid', requireAuth, requireInstructor, ctrl.deleteEnvironment);

// Venues
router.get('/:eid/venues',        requireAuth, requireInstructor, ctrl.listVenues);
router.post('/:eid/venues',       requireAuth, requireInstructor, ctrl.createVenue);
router.put('/:eid/venues/:vid',   requireAuth, requireInstructor, ctrl.updateVenue);
router.delete('/:eid/venues/:vid', requireAuth, requireInstructor, ctrl.deleteVenue);

// Rooms
router.get('/:eid/venues/:vid/rooms',         requireAuth, requireInstructor, ctrl.listRooms);
router.post('/:eid/venues/:vid/rooms',        requireAuth, requireInstructor, ctrl.createRoom);
router.put('/:eid/venues/:vid/rooms/:rid',    requireAuth, requireInstructor, ctrl.updateRoom);
router.delete('/:eid/venues/:vid/rooms/:rid', requireAuth, requireInstructor, ctrl.deleteRoom);

// Floor plan image (presign upload → confirm → get URL)
router.post('/:eid/venues/:vid/rooms/:rid/floor-plan/presign', requireAuth, requireInstructor, ctrl.presignFloorPlan);
router.post('/:eid/venues/:vid/rooms/:rid/floor-plan/confirm', requireAuth, requireInstructor, ctrl.confirmFloorPlan);
router.get('/:eid/venues/:vid/rooms/:rid/floor-plan',          requireAuth, requireInstructor, ctrl.getFloorPlanUrl);

// Artifacts (catalog per environment)
router.get('/:eid/artifacts',        requireAuth, requireInstructor, ctrl.listArtifacts);
router.post('/:eid/artifacts',       requireAuth, requireInstructor, ctrl.createArtifact);
router.put('/:eid/artifacts/:aid',   requireAuth, requireInstructor, ctrl.updateArtifact);
router.delete('/:eid/artifacts/:aid', requireAuth, requireInstructor, ctrl.deleteArtifact);

// Placements (artifact on a specific room's floor plan)
router.get('/:eid/venues/:vid/rooms/:rid/placements',         requireAuth, requireInstructor, ctrl.listPlacements);
router.post('/:eid/venues/:vid/rooms/:rid/placements',        requireAuth, requireInstructor, ctrl.createPlacement);
router.put('/:eid/venues/:vid/rooms/:rid/placements/:pid',    requireAuth, requireInstructor, ctrl.updatePlacement);
router.delete('/:eid/venues/:vid/rooms/:rid/placements/:pid', requireAuth, requireInstructor, ctrl.deletePlacement);

module.exports = router;
