'use strict';
const { Router } = require('express');
const ctrl       = require('../controllers/kcr.controller');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// All KCR routes require authentication; write operations enforce instructor role in the controller.

// Environments
router.get('/',       requireAuth, ctrl.listEnvironments);
router.post('/',      requireAuth, ctrl.createEnvironment);
router.put('/:eid',   requireAuth, ctrl.updateEnvironment);
router.delete('/:eid', requireAuth, ctrl.deleteEnvironment);

// Venues
router.get('/:eid/venues',        requireAuth, ctrl.listVenues);
router.post('/:eid/venues',       requireAuth, ctrl.createVenue);
router.put('/:eid/venues/:vid',   requireAuth, ctrl.updateVenue);
router.delete('/:eid/venues/:vid', requireAuth, ctrl.deleteVenue);

// Rooms
router.get('/:eid/venues/:vid/rooms',         requireAuth, ctrl.listRooms);
router.post('/:eid/venues/:vid/rooms',        requireAuth, ctrl.createRoom);
router.put('/:eid/venues/:vid/rooms/:rid',    requireAuth, ctrl.updateRoom);
router.delete('/:eid/venues/:vid/rooms/:rid', requireAuth, ctrl.deleteRoom);

// Floor plan image (presign upload → confirm → get URL)
router.post('/:eid/venues/:vid/rooms/:rid/floor-plan/presign', requireAuth, ctrl.presignFloorPlan);
router.post('/:eid/venues/:vid/rooms/:rid/floor-plan/confirm', requireAuth, ctrl.confirmFloorPlan);
router.get('/:eid/venues/:vid/rooms/:rid/floor-plan',          requireAuth, ctrl.getFloorPlanUrl);

// Artifacts (catalog per environment)
router.get('/:eid/artifacts',        requireAuth, ctrl.listArtifacts);
router.post('/:eid/artifacts',       requireAuth, ctrl.createArtifact);
router.put('/:eid/artifacts/:aid',   requireAuth, ctrl.updateArtifact);
router.delete('/:eid/artifacts/:aid', requireAuth, ctrl.deleteArtifact);

// Placements (artifact on a specific room's floor plan)
router.get('/:eid/venues/:vid/rooms/:rid/placements',         requireAuth, ctrl.listPlacements);
router.post('/:eid/venues/:vid/rooms/:rid/placements',        requireAuth, ctrl.createPlacement);
router.put('/:eid/venues/:vid/rooms/:rid/placements/:pid',    requireAuth, ctrl.updatePlacement);
router.delete('/:eid/venues/:vid/rooms/:rid/placements/:pid', requireAuth, ctrl.deletePlacement);

module.exports = router;
