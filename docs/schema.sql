-- Tournament Management Schema (Copa Fácil Style - Pro v1.2)

-- 1. Clubs (Centralized)
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Link to auth.users
    name TEXT NOT NULL,
    logo_url TEXT,
    colors TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Players (Centralized, linked to Clubs)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Link to auth.users
    team_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    number INTEGER DEFAULT 0,
    player_external_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tournaments
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Link to auth.users
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('league', 'knockout')),
    max_teams INTEGER DEFAULT 8,
    status TEXT DEFAULT 'attivo' CHECK (status IN ('attivo', 'nascosto', 'concluso')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tournament Teams (Junction Table)
CREATE TABLE tournament_teams (
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Link to auth.users
    PRIMARY KEY (tournament_id, team_id)
);

-- 5. Matches
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Link to auth.users
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_a_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    team_b_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    score_a INTEGER DEFAULT 0,
    score_b INTEGER DEFAULT 0,
    round INTEGER NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'league_match' CHECK (match_type IN ('league_match', 'bracket_match')),
    is_return_match BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'finished')),
    next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    position_in_round INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration Query for existing data:
-- UPDATE matches m SET match_type = t.type || '_match' FROM tournaments t WHERE m.tournament_id = t.id;
-- Note: This assumes tournament.type is 'league' or 'knockout'.

-- 6. Match Events
CREATE TABLE match_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Link to auth.users
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('goal', 'assist')),
    related_event_id UUID REFERENCES match_events(id) ON DELETE SET NULL, -- Link assist to goal if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
