const BasicAction = [
   { name: 'sheep' },
   { name: 'boar' },
   { name: 'cattle' },
   { name: 'wood' },
   { name: 'clay' },
   { name: 'stone' },
   { name: 'reed' },
   { name: 'grain' },
   { name: 'vegetable' },
   { name: 'food' },
   { name: 'renovating' },
   { name: 'fencing' },
   { name: 'plowing' },
   { name: 'sowing' },
   { name: 'baking' },
   { name: 'room_building' },
   { name: 'stable_building' },
   { name: 'childbearing' },
   { name: 'childbearing_urgent' },
   { name: 'learning' },
   { name: 'minor_improvement' },
   { name: 'major_improvement' },
   { name: 'first_player' },
];

const RoundActionCard = [
   { name: 'r11', season: 1, action: { one: 'fencing' } },
   { name: 'r12', season: 1, action: { any: [{ one: 'sowing' }, { one: 'baking' }] } },
   { name: 'r13', season: 1, action: { or: [{ one: 'minor_improvement' }, { one: 'major_improvement' }] } },
   { name: 'r14', season: 1, action: { one: 'sheep', acc: 1 } },
   { name: 'r21', season: 2, action: { one: 'stone', acc: 1 } },
   { name: 'r22', season: 2, action: { one: 'childbearing', after: { one: 'minor_improvement'} } },
   { name: 'r23', season: 2, action: { one: 'renovating', after: { or: [{ one: 'major_improvement' }, { one: 'minor_improvement' }] } } },
   { name: 'r31', season: 3, action: { one: 'vegetable' } },
   { name: 'r32', season: 3, action: { one: 'boar', acc: 1 } },
   { name: 'r41', season: 4, action: { one: 'stone', acc: 1 } },
   { name: 'r42', season: 4, action: { one: 'cattle', acc: 1 } },
   { name: 'r51', season: 5, action: { any: [{ one: 'plowing' }, { one: 'sowing' }] } },
   { name: 'r52', season: 5, action: { one: 'childbearing_urgent' } },
   { name: 'r6',  season: 6, action: { one: 'renovating', after: { one: 'fencing' } } },
];

const BasicActionCard = [
   { name: 'meeting_place', action: { any: [{ one: 'first_player' }, { one: 'minor_improvement' }] } },
   { name: 'farm_expansion', action: { any: [{ one: 'room_building', max: -1 }, { one: 'stable_building', max: -1 }] } },
   { name: 'grain_seeds', action: { one: 'grain' } },
   { name: 'farm_land', action: { one: 'plowing' } },
   { name: 'lessons', action: { one: 'learning' } },
   { name: 'day_laborer', action: { one: 'food', n: 2 } },
   { name: 'fishing', action: { one: 'food', acc: 1 } },
   { name: 'reed_bank', action: { one: 'reed', acc: 1 } },
   { name: 'clay_pit', action: { one: 'clay', acc: 1 } },
   { name: 'forest', action: { one: 'wood', acc: 3 } },
];

const ExpandedActionCard = [
   { name: 'animal_market', action: { or: [{
      action: { and: [{ one: 'sheep' }, { one: 'food' }] }
   }, {
      one: 'boar',
   }, {
      action: { and: [{ one: 'cattle' }, { one: 'food', n: -1 }] }
   }] } },
   { name: 'hollow', action: { one: 'clay', acc: 3 } },
   { name: 'resource_market4', action: { and: [{ one: 'reed' }, { one: 'stone' }, { one: 'food' }] } },
   { name: 'resource_market6', action: { and: [{ one: 'reed' }, { one: 'stone' }, { one: 'wood' }] } },
   { name: 'riverbank_forest', action: { and: [{ one: 'wood', acc: 1 }, { one: 'reed' }] } },
   { name: 'copse', action: { one: 'wood', acc: 1 } },
   { name: 'grove', action: { one: 'wood', acc: 2 } },
   { name: 'selection1', action: { or: [{
      name: 'lessons2', action: { one: 'learning' }
   }, {
      name: 'modest_wish_for_children', action: { one: 'childbearing' }
   }] } },
   { name: 'selection2', action: { or: [{
      name: 'house_building', action: { one: 'room_building', max: 1 }
   }, {
      name: 'traveling_players', action: { one: 'food', acc: 1 }
   }] } },
];

const MajorImprovementCard = [
   { name: 'fireplace', req: { clay: 2 }, score: 1, rule: [
      { transform: [{ vegetable: 1 }, { food: 2 }] },
      { transform: [{ sheep: 1 }, { food: 2 }] },
      { transform: [{ boar: 1 }, { food: 2 }] },
      { transform: [{ cattle: 1 }, { food: 3 }] },
      { action: 'baking', transform: [{ grain: 1 }, { food: 2 }] },
   ] },
   { name: 'fireplace', req: { clay: 3 }, score: 1, rule: [
      { transform: [{ vegetable: 1 }, { food: 2 }] },
      { transform: [{ sheep: 1 }, { food: 2 }] },
      { transform: [{ boar: 1 }, { food: 2 }] },
      { transform: [{ cattle: 1 }, { food: 3 }] },
      { action: 'baking', transform: [{ grain: 1 }, { food: 2 }] },
   ] },
   { name: 'cooking_hearth', req: { or: [{ clay: 4 }, { fireplace: 1 }] }, score: 2, rule: [
      { transform: [{ vegetable: 1 }, { food: 3 }] },
      { transform: [{ sheep: 1 }, { food: 2 }] },
      { transform: [{ boar: 1 }, { food: 3 }] },
      { transform: [{ cattle: 1 }, { food: 4 }] },
      { action: 'baking', transform: [{ grain: 1 }, { food: 3 }] },
   ] },
   { name: 'cooking_hearth', req: { or: [{ clay: 5 }, { fireplace: 1 }] }, score: 2, rule: [
      { transform: [{ vegetable: 1 }, { food: 3 }] },
      { transform: [{ sheep: 1 }, { food: 2 }] },
      { transform: [{ boar: 1 }, { food: 3 }] },
      { transform: [{ cattle: 1 }, { food: 4 }] },
      { action: 'baking', transform: [{ grain: 1 }, { food: 3 }] },
   ] },
   { name: 'well', req: { wood: 1, stone: 3 }, score: 4, effect: { food: 1, round_plus: [1, 2, 3, 4, 5] } },
   { name: 'clay_oven', req: { clay: 3, stone: 1 }, score: 2, rule: [{ action: 'baking', transform: [{ grain: 1 }, { food: 5 }], max: 1 }] },
   { name: 'stone_oven', req: { clay: 1, stone: 3 }, score: 3, rule: [{ action: 'baking', transform: [{ grain: 1 }, { food: 4 }], max: 2 }] },
   { name: 'joinery', req: { wood: 2, stone: 2 }, score: 2, rule: [
      { phase: 'harvest', transform: [{ wood: 1 }, { food: 2 }], max: 1 },
      { phase: 'score', transform: [{ wood: [3, 5, 7] }, { score: [1, 2, 3] }] }
   ] },
   { name: 'pottery', req: { clay: 2, stone: 2 }, score: 2, rule: [
      { phase: 'harvest', transform: [{ clay: 1 }, { food: 2 }], max: 1 },
      { phase: 'score', transform: [{ clay: [3, 5, 7] }, { score: [1, 2, 3] }] }
   ] },
   { name: 'basketmaker_workshop', req: { reed: 2, stone: 2 }, score: 2, rule: [
      { phase: 'harvest', transform: [{ reed: 1 }, { food: 3 }], max: 1 },
      { phase: 'score', transform: [{ reed: [2, 4, 5] }, { score: [1, 2, 3] }] }
   ] },
];

module.exports = {
   BasicAction,
   RoundActionCard,
   BasicActionCard,
   ExpandedActionCard,
   MajorImprovementCard,
};
