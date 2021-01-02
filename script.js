(($) => {
  const STATE_KEY = 'spotify_auth_state';

  // random alphanumeric string of given length
  const generateRandomString = (length) => {
    let text = '';
    const possible = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < length; i += 1) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  // pads double digit number
  const pad2D = (number) => (number < 10 ? '0' : '') + number;

  const hashParams = new URLSearchParams(window.location.hash.substr(1));

  const accessToken = hashParams.get('access_token');
  const state = hashParams.get('state');
  const storedState = localStorage.getItem(STATE_KEY);

  let userId = null;
  let playlistId = null;
  let playlistName = null;
  let percentage = 0;

  let trackInfo = null;
  let progressMs = null;

  const querySpotify = async (method, endpoint, data = null) => new Promise((resolve, reject) => {
    const ajaxRequest = {
      url: `https://api.spotify.com/v1${endpoint}`,
      type: method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      success: resolve,
      error: reject,
    };
    if (data) ajaxRequest.data = JSON.stringify(data);
    $.ajax(ajaxRequest);
  });

  const updateTrackDetails = () => {
    if (!trackInfo) {
      $('#album').attr('src', '');
      $('#song-progress').attr('max', 100).val(0);
      $('#track').html('No track playing.');
      $('#artist').html('');
      return;
    }

    const trackName = trackInfo.name;
    const albumImage = trackInfo.album.images[0];
    const artistNames = [];
    trackInfo.artists.forEach(({ name }) => artistNames.push(name));
    $('#album').attr('src', albumImage.url).attr('width', albumImage.width).attr('height', albumImage.height);
    $('#song-progress').attr('max', trackInfo.duration_ms).val(progressMs);
    $('#track').html(trackName);
    $('#artist').html(artistNames.join(', '));
  };

  const setTrackTime = async (time) => querySpotify('PUT', `/me/player/seek?${$.param({ position_ms: time })}`);

  const setIsPlaying = (playing) => {
    if (playing) {
      $('.show-if-playing').show();
      $('.show-if-paused').hide();
    } else {
      $('.show-if-playing').hide();
      $('.show-if-paused').show();
    }
  };

  const updateLoader = (elem, loading) => {
    const element = $(elem);
    if (loading) {
      element.prepend('<div class="loader"></div>');
    } else {
      element.find('.loader').remove();
    }
  };

  const playTrack = async () => {
    await querySpotify('PUT', '/me/player/play');
    setIsPlaying(true);
  };

  const pauseTrack = async () => {
    await querySpotify('PUT', '/me/player/pause');
    setIsPlaying(false);
  };

  // user could switch songs/playlists manually, so this will be called
  // every time we need to access the current track info
  const updateTrackInfo = async () => {
    const response = await querySpotify('GET', '/me/player/currently-playing');
    if (!response) {
      trackInfo = null;
      progressMs = null;
      setIsPlaying(false);
      return;
    }

    trackInfo = response.item;
    progressMs = response.progress_ms;
    setIsPlaying(response.is_playing);
  };

  const createPlaylist = async () => {
    const currentDate = new Date();
    const datetime = `${currentDate.getFullYear()}-${
      pad2D(currentDate.getMonth() + 1)}-${
      pad2D(currentDate.getDate())} @ ${
      pad2D(currentDate.getHours())}:${
      pad2D(currentDate.getMinutes())}:${
      pad2D(currentDate.getSeconds())}`;

    const response = await querySpotify('POST', `/users/${userId}/playlists`, { name: `QuickDiscover ${datetime}`, public: false });

    playlistId = response.id;
    playlistName = response.name;
    const option = $('option[value="CREATE"]');
    option.html(playlistName);
    option.attr('value', playlistId);
  };

  const addTrackURIToPlaylist = async () => {
    // lazily create playlist
    if (!playlistId) await createPlaylist();

    await updateTrackInfo();
    return querySpotify('POST', `/users/${userId}/playlists/${playlistId}/tracks?${$.param({ uris: trackInfo.uri })}`);
  };

  const update = async () => {
    await updateTrackInfo();
    updateTrackDetails();
  };

  const restartTrack = async () => {
    await setTrackTime(Math.floor(trackInfo.duration_ms * percentage));

    // just in case not already playing
    try {
      await playTrack();
    } catch {
      // probably already playing
    }

    await update();
  };

  const nextTrack = async () => {
    await updateTrackInfo();

    // store current track
    const prevTrackID = trackInfo.id;
    // resolves after the track changes
    const waitUntilNext = async () => {
      await updateTrackInfo();
      // if we have not changed songs, fetch again and recheck
      if (prevTrackID === trackInfo.id) { await waitUntilNext(); }
    };

    await querySpotify('POST', '/me/player/next');
    await waitUntilNext();
    if (percentage > 0) await restartTrack();
    updateTrackDetails();
  };

  // 50 is maximum limit (default is 20)
  const getPlaylists = async () => querySpotify('GET', '/me/playlists?limit=50');

  const setReady = () => {
    // update song info every 5 seconds
    setInterval(update, 5000);
    update();
  };

  // auth logic
  (async () => {
    if (accessToken && (state == null || state !== storedState)) {
      alert('There was an error during authentication');
      $('.login').show();
      $('.loggedin').hide();
    } else if (accessToken) {
      $('.login').hide();
      $('.loggedin').show();

      userId = (await querySpotify('GET', '/me')).id;
      const response = await getPlaylists();

      const selectPlaylists = $('select#playlists');
      // for each playlist, add an option to the selection input
      response.items.forEach((playlist) => {
        // skip if owned by someone else and not collaborative
        if (playlist.owner.id !== userId && !playlist.collaborative) {
          return;
        }
        selectPlaylists.append($('<option/>', {
          value: playlist.id,
          text: playlist.name,
        }));
      });

      setReady();
    } else {
      $('.login').show();
      $('.loggedin').hide();
    }
  })();

  $('button#login-button').click(() => {
    const clientId = '69f480d434c5401e9762d6cd7b720ec4'; // Your client id
    const redirectUri = window.location.href; // Your redirect uri

    const newState = generateRandomString(16);

    localStorage.setItem(STATE_KEY, newState);
    const scope = 'user-modify-playback-state user-read-currently-playing playlist-modify-private playlist-read-collaborative playlist-read-private playlist-modify-public';

    const url = `https://accounts.spotify.com/authorize?response_type=token&client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(newState)}`;

    window.location = url;
  });

  $('button#add').click(async (e) => {
    updateLoader(e.currentTarget, true);

    await addTrackURIToPlaylist();
    // log to table
    const tr = $(`<tr><td>${(trackInfo && trackInfo.name) || 'error'}</td><td>${playlistName || 'error'}</td></tr>`);
    if (trackInfo) {
      const currentUrl = trackInfo.external_urls.spotify;
      tr.click(() => window.open(currentUrl, '_blank'));
    }
    $('table > tbody').append(tr);

    await nextTrack();

    updateLoader(e.currentTarget, false);
  });

  $('button#skip').click(async (e) => {
    updateLoader(e.currentTarget, true);
    await nextTrack();
    updateLoader(e.currentTarget, false);
  });

  $('button#start').click(async (e) => {
    updateLoader(e.currentTarget, true);
    restartTrack();
    updateLoader(e.currentTarget, false);
  });

  $('button#pause').click(async (e) => {
    updateLoader(e.currentTarget, true);
    await pauseTrack();
    updateLoader(e.currentTarget, false);
  });

  $('select#playlists').change(async (e) => {
    const val = $(e.currentTarget).val();
    if (val === 'CREATE') {
      playlistId = null;
      playlistName = null;
    } else {
      playlistId = val;
      playlistName = $('select#playlists > option:selected').text();
    }
  });

  $('input#start-percentage').change(async (e) => {
    percentage = e.currentTarget.value;
  });
})(jQuery);
