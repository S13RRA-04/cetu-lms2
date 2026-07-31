/*
  Case File — official base/generic Inject Decks (20 Positive + 20 Negative),
  as authored in the project's Inject Card Deck reference. Case-specific
  Facilitator Guides may swap in case-flavored cards, but the band ratios
  (Positive: Momentum 40% / Relief 25% / Lead 25% / Expedite 10%; Negative:
  Delay 35% / Escalation 30% / Setback 20% / Suppression 15%) and each
  band's mechanical effect are fixed by the base rules, not per-case.

  `effect` is a short machine key the coordinator-facing UI uses to decide
  which follow-up action to offer the facilitator once a card is drawn:
    positive: recover_token | reduce_pressure | bonus_card | expedite_queue
    negative: delay_queue | increase_pressure | lose_token | suppress_evidence
*/

export const POSITIVE_INJECTS = [
  // Momentum — 8 cards (40%) — Effect: Recover 1 Resource Token.
  { title: 'Second Wind', flavor: 'An anonymous tip lands at just the right moment.', band: 'momentum', effect: 'recover_token' },
  { title: 'Overtime Approved', flavor: 'Command signs off on extra hours for the team.', band: 'momentum', effect: 'recover_token' },
  { title: 'Borrowed Equipment', flavor: 'A neighboring unit lends specialized gear, no questions asked.', band: 'momentum', effect: 'recover_token' },
  { title: 'Fresh Set of Eyes', flavor: 'A colleague reviews the file and spots something the team missed.', band: 'momentum', effect: 'recover_token' },
  { title: 'Favor Called In', flavor: 'An old contact owes someone on the team one.', band: 'momentum', effect: 'recover_token' },
  { title: 'Budget Line Found', flavor: 'An unused line item frees up funding for the case.', band: 'momentum', effect: 'recover_token' },
  { title: 'Volunteer Support', flavor: 'A retired investigator offers to consult, unpaid.', band: 'momentum', effect: 'recover_token' },
  { title: 'Good Press', flavor: 'A sympathetic news piece builds public goodwill for the investigation.', band: 'momentum', effect: 'recover_token' },

  // Relief — 5 cards (25%) — Effect: Reduce Command Pressure by 1 level.
  { title: 'Command Reassured', flavor: 'A briefing goes well; leadership backs off.', band: 'relief', effect: 'reduce_pressure' },
  { title: 'Political Cover', flavor: "An ally in the prosecutor's office runs interference.", band: 'relief', effect: 'reduce_pressure' },
  { title: 'Story Fades', flavor: 'Media attention moves on to something else.', band: 'relief', effect: 'reduce_pressure' },
  { title: 'Union Support', flavor: 'Team morale steadies after a show of institutional support.', band: 'relief', effect: 'reduce_pressure' },
  { title: 'Quiet Week', flavor: 'No new complications surface; the team gets room to breathe.', band: 'relief', effect: 'reduce_pressure' },

  // Lead — 5 cards (25%) — Effect: Draw 1 bonus Evidence Card from a chosen category, at current Evidence Value.
  { title: 'Cooperative Witness', flavor: 'Someone finally agrees to talk.', band: 'lead', effect: 'bonus_card' },
  { title: 'Additional Victim Comes Forward', flavor: 'A new complainant corroborates the pattern.', band: 'lead', effect: 'bonus_card' },
  { title: 'Helpful Partner Agency', flavor: 'A partner agency shares relevant material unprompted.', band: 'lead', effect: 'bonus_card' },
  { title: 'Favorable Intelligence', flavor: 'An intercept or tip points the team toward solid ground.', band: 'lead', effect: 'bonus_card' },
  { title: 'Breakthrough', flavor: 'A stalled thread suddenly clicks into place.', band: 'lead', effect: 'bonus_card' },

  // Expedite — 2 cards (10%) — Effect: Advance 1 Pending Returns Queue card one additional space.
  { title: 'Court Prioritizes Request', flavor: 'A judge fast-tracks the pending order.', band: 'expedite', effect: 'expedite_queue' },
  { title: 'Lab Bumps the Queue', flavor: 'Forensic processing jumps ahead of schedule.', band: 'expedite', effect: 'expedite_queue' },
];

export const NEGATIVE_INJECTS = [
  // Delay — 7 cards (35%) — Effect: Push 1 Pending Returns Queue card back one space (floor: its own tier's starting space).
  { title: "Backlog at the Clerk's Office", flavor: 'Paperwork sits in a queue behind dozens of others.', band: 'delay', effect: 'delay_queue' },
  { title: 'Lab Short-Staffed', flavor: 'Forensic turnaround slows.', band: 'delay', effect: 'delay_queue' },
  { title: 'Judge Unavailable', flavor: 'The signing judge is out until further notice.', band: 'delay', effect: 'delay_queue' },
  { title: 'Records Custodian on Leave', flavor: 'The person who can authorize release is gone.', band: 'delay', effect: 'delay_queue' },
  { title: 'Third-Party Objection Filed', flavor: 'Opposing counsel contests the request.', band: 'delay', effect: 'delay_queue' },
  { title: 'System Outage', flavor: 'The records system holding the requested data goes down.', band: 'delay', effect: 'delay_queue' },
  { title: 'Holiday Closure', flavor: 'The relevant office is closed for the week.', band: 'delay', effect: 'delay_queue' },

  // Escalation — 6 cards (30%) — Effect: Increase Command Pressure by 1 level.
  { title: 'Leak to the Press', flavor: 'Details of the investigation surface publicly.', band: 'escalation', effect: 'increase_pressure' },
  { title: 'Complaint Filed', flavor: 'A subject of the investigation files a formal complaint.', band: 'escalation', effect: 'increase_pressure' },
  { title: 'Political Inquiry', flavor: 'An elected official requests a status briefing.', band: 'escalation', effect: 'increase_pressure' },
  { title: 'Internal Review Opened', flavor: "The investigation's conduct comes under scrutiny.", band: 'escalation', effect: 'increase_pressure' },
  { title: 'Community Pressure', flavor: 'Public statements demand faster results.', band: 'escalation', effect: 'increase_pressure' },
  { title: 'Command Turnover', flavor: "A new supervisor wants immediate justification for the case's direction.", band: 'escalation', effect: 'increase_pressure' },

  // Setback — 4 cards (20%) — Effect: Lose 1 Resource Token (team's choice of category).
  { title: 'Overtime Denied', flavor: 'Budget constraints cut planned hours.', band: 'setback', effect: 'lose_token' },
  { title: 'Equipment Failure', flavor: 'A piece of essential gear breaks down.', band: 'setback', effect: 'lose_token' },
  { title: 'Contact Goes Cold', flavor: 'A source stops responding.', band: 'setback', effect: 'lose_token' },
  { title: 'Reassignment', flavor: 'A team member is pulled onto another case temporarily.', band: 'setback', effect: 'lose_token' },

  // Suppression — 3 cards (15%) — Effect: Reduce 1 Evidence Card's Evidence Value by 1 (minimum 0).
  { title: 'Chain of Custody Challenged', flavor: 'A defense motion questions how evidence was handled.', band: 'suppression', effect: 'suppress_evidence' },
  { title: 'Witness Recants', flavor: 'A prior statement is walked back.', band: 'suppression', effect: 'suppress_evidence' },
  { title: 'Evidence Ruled Inadmissible', flavor: 'A judge excludes a piece of the case file on procedural grounds.', band: 'suppression', effect: 'suppress_evidence' },
];

export const POSITIVE_BAND_LABELS = {
  momentum: 'Momentum — Recover 1 Resource Token',
  relief: 'Relief — Reduce Command Pressure 1 level',
  lead: 'Lead — Draw 1 bonus Evidence Card',
  expedite: 'Expedite — Advance a queued card 1 space',
};

export const NEGATIVE_BAND_LABELS = {
  delay: 'Delay — Push a queued card back 1 space',
  escalation: 'Escalation — Increase Command Pressure 1 level',
  setback: "Setback — Lose 1 Resource Token",
  suppression: "Suppression — Reduce a card's Evidence Value by 1",
};
