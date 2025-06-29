// enums.js
// Central file for all enums used in the project

const CellType = Object.freeze({
  TURNING_POINT: 'TURNING_POINT',
  FIXTURE: 'FIXTURE',
  ENTRY_GATE: 'ENTRY_GATE',
  EXIT_GATE: 'EXIT_GATE',
});

const CustomerEntry = Object.freeze({
  ROYAL_REST: 'Royal rest',
  HOMEBOX: 'HomeBox',
  LIFT: 'Lift',
});

const CustomerSegmentation = Object.freeze({
  SINGLE_MALE: 'Single - Male',
  SINGLE_FEMALE: 'Single - Female',
  COUPLE: 'Couple',
  COUPLE_WITH_CHILDREN: 'Couple with Children',
  LARGE_FAMILY: 'Large Family',
});

const Nationality = Object.freeze({
  NATIONAL: 'National',
  ARAB_EXPATS: 'Arab Expats',
  ISC: 'ISC',
  SEAC: 'SEAC',
  AFRICANS: 'Africans',
  WESTERN: 'Western',
});

const Role = Object.freeze({
  SUPERUSER: 'SUPERUSER',
  STAFF: 'STAFF',
});

module.exports = {
  CellType,
  CustomerEntry,
  CustomerSegmentation,
  Nationality,
  Role,
};
