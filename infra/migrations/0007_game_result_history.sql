create unique index if not exists game_results_room_code_unique_idx on game_results(room_code);

create table if not exists game_result_players (
  result_id uuid not null references game_results(id) on delete cascade,
  player_id text not null,
  user_id uuid references users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 2 and 24),
  score integer not null check (score >= 0),
  rank integer not null check (rank > 0),
  primary key (result_id,player_id)
);
create index if not exists game_result_players_user_history_idx on game_result_players(user_id,result_id) where user_id is not null;
create unique index if not exists game_result_players_result_user_unique_idx on game_result_players(result_id,user_id) where user_id is not null;
