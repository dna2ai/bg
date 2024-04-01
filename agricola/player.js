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
   const effect = [];
   if (player.applied_major_cards.find(x => x.name == 'fireplace' || x.name == 'cooking_hearth')) {
      if (player.sheep > 0) effect.push({ transform: ['sheep', 'food'] });
      if (player.boar > 0) effect.push({ transform: ['boar', 'food'] });
      if (player.cattle > 0) effect.push({ transform: ['cattle', 'food'] });
   }
   if (player.grain > 0) effect.push({ transform: ['grain', 'food'] });
   if (player.vegetable > 0) effect.push({ transform: ['vegetable', 'food'] });
}
function player_build_actions(deck, player) {
   // TODO: according to deck, generate possible effects if take actions
   // effect: { costs, req, ...{benefits+conditions} }
   const stat = player_check_available_action(player, deck);
   // TODO: for each action, check available status
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

function _player_stat(player) {
   const r = {
      room: 0,
      empty: 0,
      plowed: 0,
      empty_plowed: 0,
      fenced: 0,
      stable: 0,
      fenced_stable: 0,
      min_wood_fence: 9,
   };
   player.fields.forEach((row, i) => {
      row.forEach((cell, j) => {
         if (cell.room) r.room_n++;
         if (Object.keys(cell).length == 0) r.empty++;
         if (cell.plowed) {
            r.plowed++;
            if (!cell.sowed) r.empty_plowed++;
         }
         if (cell.fenced) {
            r.fenced++;
            if (cell.stable) r.fenced_stable++;
         }
         if (cell.stable) r.stable++;
         if (!cell.room && !cell.plowed) {
            const ib = i*2;
            const x = (
               (player.fences[ib][j] == 1 ? 0 : 1) +
               (player.fences[ib+1][j] == 1 ? 0 : 1) +
               (player.fences[ib+1][j+1] == 1 ? 0 : 1) +
               (player.fences[ib+2][j] == 1 ? 0 : 1)
            );
            if (r.min_wood_fence > x && x > 0) r.min_wood_fence = x;
         }
      });
   });
   return r;
}

const always_available_actions = [
   'sheep', 'boar', 'cattle', 'wood', 'clay', 'stone', 'reed',
   'grain', 'vegetable', 'food', 'fisrt_player',
];
function player_check_available_action(player, deck) {
   const map = {};
   const stat = _player_stat(player);
   always_available_actions.forEach(one => { map[one] = true; });

   // TODO: occupation + minor improvement reduce
   const room_n = stat.room;
   map.renovating = player.reed >= 1 && (
      player.roomlv == 0 && player.clay >= room_n
   ) || (
      player.roomlv == 1 && player.stone >= room_n
   );

   const min_wood_fences = stat.min_wood_fence;
   map.fencing = min_wood_fences != 9 && player.wood >= min_wood_fences;

   const empty_n = stat.empty;
   map.plowing = empty_n > 0;

   const empty_plowed_n = stat.plowed;
   map.sowing = empty_plowed_n > 0 && (player.grain > 0 || player.vegetable > 0);

   map.baking = player.grain > 0;
   map.room_building = empty_n > 0 && player.reed >= 2 (
      (player.roomlv == 0 && player.wood >= 5) ||
      (player.roomlv == 1 && player.clay >= 5) ||
      (player.roomlv == 2 && player.stone >= 5) ||
   );
   const fenced_stable_n = stat.fenced_stable;
   const fenced_n = stat.fenced;
   const stable_n = stat.stable;
   map.stable_building = player.wood >= 2 && stable_n < 5 && (
      empty_n > 0 || (fenced_stable_n < fenced_n)
   );
   map.childbearing = player.actors < 5 && room_n > player.actors;
   map.childbearing_urgent = player.actors < 5;
   map.learning = player.occupations.length > 0;
   map.minor_improvement = player.minor_cards.length > 0;
   map.major_improvement = deck ? deck.major_cards.length > 0 : false;
   return map;
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
   player_check_available_action,
};
