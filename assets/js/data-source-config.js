/*
  Free Fire Data Center data-source overrides.

  IMPORTANT:
  - Use a PUBLIC anon key for frontend deployment.
  - Do NOT place a Supabase service_role key in this file if the package will be
    hosted publicly on GitHub Pages or any static host.

  Historical table default expected by this package: public.historical_team_results
*/
window.FFDC_DATA_SOURCES = {
  historical: {
    id: 'historical',
    label: 'Historical Supabase',
    url: 'https://gkugecflfddkpitlrmws.supabase.co',
    anonKey: '',
    table: 'historical_team_results',
    tableCandidates: [
      'historical_team_results',
      'ff_historical_team_results',
      'ff_historical_data',
      'ffws_historical_data',
      'ewc_qualifier_data',
      'historical_data',
      'ff_match_results',
      'ff_player_stats_raw'
    ],
    type: 'team_match_history'
  }
};
