const CLIENT_ID =
  "189755131234-l1igl11uu8j0mc0f7fu3svrtj5pr6hn1.apps.googleusercontent.com";
const API_KEY = "AIzaSyCEg0x4xasL2A99F7A-mXoMP6g3Y-IHqj0";

const signinOldAccount = document.getElementById("signin-old");
const signinNewAccount = document.getElementById("signin-new");
const notifications = document.getElementById("notifications");
const transfer = document.getElementById("transfer");
const oldData = document.getElementById("old-data");

const USER_DATA = {
  subscriptions: [],
  liked: []
};

gapi.load("client:auth2", () => {
  gapi.auth2.init({ client_id: CLIENT_ID });
});

const notify = msg => {
  notifications.innerHTML = msg;
};

const authenticate = () => {
  notify("Signing in...");
  return gapi.auth2
    .getAuthInstance()
    .signIn({ scope: "https://www.googleapis.com/auth/youtube" })
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
        console.log(err);

        throw new Error("Error fetching data. Please try again");
      }
    );
};

const transferSubscriptions = () => {
  notify("Transferring subsciptions...");
  return Promise.all(
    USER_DATA.subscriptions.map(el =>
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
    USER_DATA.liked.map(el =>
      gapi.client.youtube.videos.rate({
        id: el,
        rating: "like"
      })
    )
  );
};

const getOldAccountData = () => {
  return getSubscriptions().then(getLikedVideos);
};

signinOldAccount.onclick = () => {
  authenticate()
    .then(loadClient)
    .then(() => signinOldAccount.remove())
    .then(() => getOldAccountData())
    .then(() => {
      notify("Data fetched successfully. Please sign in with your new account");
      let content = `${USER_DATA.subscriptions.length} subscriptions | ${USER_DATA.liked.length} liked videos`;
      oldData.innerHTML = content;
    })
    .then(() => signinNewAccount.classList.remove("d-none"))
    .catch(err => {
      notify(err);
    });
};

signinNewAccount.onclick = () => {
  authenticate()
    .then(loadClient)
    .then(() => signinNewAccount.remove())
    .then(() => notify("Signed in with new account"))
    .then(() => transfer.classList.remove("d-none"))
    .catch(err => {
      notify(err);
    });
};

transfer.onclick = () => {
  transferSubscriptions()
    .then(transferLikedVideos)
    .then(() => notify("Transfer successful!"))
    .catch(err => {
      notify("Error. Please try again");
    });
};
