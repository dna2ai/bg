function player_new(id) {
   const p = {};
   p.id = id;
   p.sheep = 0;
   p.boar = 0;
   p.cattle = 0;
   p.wood = 0;
   p.clay = 0;
   p.stone = 0;
   p.reed = 0;
   p.grain = 0;
   p.vegetable = 0;
   p.actors = 2;
   p.acted_actors = 0;
   p.children = 0;
   p.roomlv = 0;
   p.fields = [
      [{ room: 1 }, {}, {}, {}, {}],
      [{ room: 1 }, {}, {}, {}, {}],
      [{}, {}, {}, {}, {}],
   ];
   p.fences = [ // 0: no fence, 1: fence, 9: unavailable
      [ 9, 0, 0, 0, 0,  ]
      [9, 0, 0, 0, 0, 0,]
      [ 9, 0, 0, 0, 0,  ]
      [9, 0, 0, 0, 0, 0,]
      [ 0, 0, 0, 0, 0,  ]
      [0, 0, 0, 0, 0, 0,]
      [ 0, 0, 0, 0, 0,  ]
   ]; //              ^ fencing from right-bottom side
   p.minor_cards = [];
   p.occupations = [];
   p.applied_minor_cards = [];
   p.applied_major_cards = [];
   p.applied_occupations = [];
   p.private_actions = [];
   p.public_effects = [];
   p.public_actions = []; // TODO: think about if need this, we may merge into deck.actions
   return p;
}

function player_add_minor_card(player, minor_card) {
   player.minor_cards.push(minor_card);
}

function player_add_occupation(player, lesson) {
   player.occupations.push(lesson);
}

function player_build_effects(deck, player) {
   // TODO: list all possible effects before use a family member to make one action
   //       e.g. baking vegetable to food if having fireplace
}
function player_build_actions(deck, player) {
   // TODO: according to deck, generate possible effects if take actions
   // effect: { costs, req, ...{benefits+conditions} }
}
function player_build_fences(player) {
   // TODO: according to count(wood), generate possible solutions
}
function player_plow_fields(player) {
   // TODO: generate possible field(s) positions
}
function player_build_rooms(player) {
   // TODO: generate possible N room(s) positions
}
function player_build_stables(player) {
   // TODO: generate N stable(s) positions
}

function player_get_self_score(player) {
   // TODO: get player score with only player info
   //       no consider deck info like someone else play a card
   //       to make the player get extra points
}
function player_get_extra_score(player, deck) {
   // TODO: get player score with not-current-player info on a deck
}

module.exports = {
   player_new,
   player_add_minor_card,
   player_add_occupation,
   player_build_effects,
   player_build_actions,
   player_plow_fields,
   player_build_rooms,
   player_build_stables,
   player_get_self_score,
   player_get_extra_score,
};
