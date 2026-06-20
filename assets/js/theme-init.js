(function(){
      const KEY = 'ff_theme_v1';
      const saved = localStorage.getItem(KEY);
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = saved || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-accent', localStorage.getItem('ewc_team_center_color_theme_v1') || 'blue');
    })();
