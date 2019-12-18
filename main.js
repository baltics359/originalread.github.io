const CLIENT_ID =
  "189755131234-l1igl11uu8j0mc0f7fu3svrtj5pr6hn1.apps.googleusercontent.com";
const API_KEY = "AIzaSyCEg0x4xasL2A99F7A-mXoMP6g3Y-IHqj0";

const signinOldAccount = document.getElementById("signin-old");
const signinNewAccount = document.getElementById("signin-new");
const notifications = document.getElementById("notifications");
const status = document.getElementById("status");
const transfer = document.getElementById("transfer");
const oldData = document.getElementById("old-data");

const USER_DATA = {
  subscriptions: [],
  liked: [],
  playlists: {}
};

gapi.load("client:auth2", () => {
  gapi.auth2.init({ client_id: CLIENT_ID });
});

const notify = msg => {
  notifications.innerHTML = msg;
};

const setStatus = msg => {
  status.innerHTML = msg;
};

signinOldAccount.onclick = () => {
  authenticate()
    .then(loadClient)
    .then(() => signinOldAccount.remove())
    .then(() => getOldAccountData())
    .then(() => {
      notify("Data fetched successfully. Please sign in with your new account");
      let content = `${USER_DATA.subscriptions.length} subscriptions | ${
        USER_DATA.liked.length
      } liked videos | ${Object.keys(USER_DATA.playlists).length} playlists`;
      oldData.innerHTML = content;
    })
    .then(() => signinNewAccount.classList.remove("d-none"))
    .catch(err => {
      notify(err);
    });
};

const authenticate = () => {
  notify("Signing in...");
  return gapi.auth2
    .getAuthInstance()
    .signIn({ scope: "https://www.googleapis.com/auth/youtube.force-ssl" })
    .then(
      () => {
        notify("Sign-in successful");
      },
      err => {
        throw new Error("Sign-in failed. Please try again");
      }
    );
};

const loadClient = () => {
  gapi.client.setApiKey(API_KEY);
  return gapi.client
    .load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
    .then(null, err => {
      throw new Error("Error. Please try again");
    });
};

const getOldAccountData = () => {
  return getSubscriptions()
    .then(getLikedVideos)
    .then(getPlaylists)
    .then(getPlaylistItems);
};

const getSubscriptions = (pageToken = null) => {
  notify("Fetching your subscriptions...");

  return gapi.client.youtube.subscriptions
    .list({
      part: "snippet",
      mine: true,
      maxResults: 50,
      pageToken: pageToken ? pageToken : undefined
    })
    .then(
      response => {
        response.result.items.forEach(element => {
          USER_DATA.subscriptions.push(element.snippet.resourceId.channelId);
        });
        nextPage = response.result.nextPageToken;
        if (nextPage)
          return getSubscriptions((pageToken = response.result.nextPageToken));
        else {
          notify("Subscriptions fetched successfully");
        }
      },
      err => {
        throw new Error("Error fetching data. Please try again");
      }
    );
};

const getLikedVideos = (pageToken = null) => {
  notify("Fetching your liked videos...");

  return gapi.client.youtube.videos
    .list({
      part: "id",
      myRating: "like",
      maxResults: 50,
      pageToken: pageToken ? pageToken : undefined
    })
    .then(
      response => {
        response.result.items.forEach(element => {
          USER_DATA.liked.push(element.id);
        });
        nextPage = response.result.nextPageToken;
        if (nextPage)
          return getLikedVideos((pageToken = response.result.nextPageToken));
        else {
          notify("Liked videos fetched successfully");
        }
      },
      err => {
        throw new Error("Error fetching data. Please try again");
      }
    );
};

const getPlaylists = (pageToken = null) => {
  notify("Fetching your playlists...");

  return gapi.client.youtube.playlists
    .list({
      part: "snippet",
      maxResults: 50,
      mine: true,
      pageToken: pageToken ? pageToken : undefined
    })
    .then(
      response => {
        response.result.items.forEach(element => {
          let id = element.id;
          USER_DATA.playlists[id] = {
            title: element.snippet.title,
            description: element.snippet.description,
            items: []
          };
        });
        nextPage = response.result.nextPageToken;
        if (nextPage)
          return getPlaylists((pageToken = response.result.nextPageToken));
        else {
          notify("Playlists fetched successfully");
        }
      },
      err => {
        throw new Error("Error fetching data. Please try again");
      }
    );
};

const getPlaylistItems = (pageToken = null) => {
  notify("Fetching your playlist items...");

  return Promise.all(
    Object.keys(USER_DATA.playlists).map(playlist =>
      gapi.client.youtube.playlistItems
        .list({
          part: "contentDetails",
          playlistId: playlist,
          maxResults: 50,
          pageToken: pageToken ? pageToken : undefined
        })
        .then(
          response => {
            response.result.items.forEach(element => {
              USER_DATA.playlists[playlist].items.push(
                element.contentDetails.videoId
              );
            });
            nextPage = response.result.nextPageToken;
            if (nextPage)
              return getPlaylistItems(
                (pageToken = response.result.nextPageToken)
              );
            else {
              notify("Playlist items fetched successfully");
            }
          },
          err => {
            throw new Error("Error fetching data. Please try again");
          }
        )
    )
  );
};

signinNewAccount.onclick = () => {
  authenticate()
    .then(loadClient)
    .then(() => {
      notify("Signed in with new account");
      signinNewAccount.remove();
      transfer.classList.remove("d-none");
    })
    .catch(err => notify(err));
};

signinNewAccount.onclick = () => {
  authenticate()
    .then(loadClient)
    .then(() => signinNewAccount.remove())
    .then(() => notify("Signed in with new account. Please initiate transfer"))
    .then(() => transfer.classList.remove("d-none"))
    .catch(err => {
      notify(err);
    });
};

transfer.onclick = () => {
  transferSubscriptions()
    .then(transferLikedVideos)
    .then(transferPlaylists)
    .then(transferPlaylistItems)
    .then(() => notify("Transfer successful!"))
    .catch(err => {
      console.log(err);
      console.log(USER_DATA);
    });
};

const transferSubscriptions = () => {
  notify("Transferring subsciptions...");
  return Promise.all(
    USER_DATA.subscriptions.slice(1, 3).map(el =>
      gapi.client.youtube.subscriptions.insert({
        part: "snippet",
        resource: {
          snippet: {
            resourceId: {
              kind: "youtube#channel",
              channelId: el
            }
          }
        }
      })
    )
  );
};

const transferLikedVideos = () => {
  notify("Transferring liked videos...");
  return Promise.all(
    USER_DATA.liked.slice(1, 3).map(el =>
      gapi.client.youtube.videos.rate({
        id: el,
        rating: "like"
      })
    )
  );
};

const transferPlaylists = () => {
  notify("Transferring playlists...");
  return Promise.all(
    Object.values(USER_DATA.playlists).map(v =>
      gapi.client.youtube.playlists
        .insert({
          part: "snippet",
          resource: {
            snippet: {
              title: v.title,
              description: v.description
            }
          }
        })
        .then(res => res.json())
        .then(data => (USER_DATA.playlists[k].newId = data.id))
    )
  );
};

const transferPlaylistItems = () => {
  notify("Transferring playlist items...");
  promises = [];
  Object.values(USER_DATA.playlists).forEach(pl => {
    promises.push(
      Promise.all(
        pl.items.slice(1, 3).map(video =>
          gapi.client.youtube.playlistItems.insert({
            part: "snippet",
            resource: {
              snippet: {
                playlistId: pl.newId,
                // position: 0,
                resourceId: {
                  kind: "youtube#video",
                  videoId: video
                }
              }
            }
          })
        )
      )
    );
  });
  return Promise.all(promises);
};
