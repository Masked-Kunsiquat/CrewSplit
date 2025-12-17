// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from "./meta/_journal.json";
import m0000 from "./0000_aberrant_moira_mactaggert.sql";
import m0001 from "./0001_closed_wind_dancer.sql";
import m0002 from "./0002_seed_system_categories.sql";
import m0003 from "./0003_fix_category_fk_restrict.sql";
import m0004 from "./0004_free_xavin.sql";

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};
