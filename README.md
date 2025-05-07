# Swarm Comment System web component

This is an embeddable widget that can be added to any HTML page. It renders a decentralised discussion system where
everybody can comment in tree structure.

## Swarm network

Swarm is a peer-to-peer network of Bee nodes that collectively provide censorship resistant decentralised storage and
communication services.

## Example Usage

```javascript
<div id="comments"></div>
<link rel="stylesheet" href="your-link-to-the-lib-css">
<script src="your-link-to-the-swarm-comment-system-ui-lib"></script>
<script>
    window.SwarmCommentSystem.renderSwarmComments('comments')
</script>
```

## Integrating it into a react application

```javascript
return (
  <React.StrictMode>
    <App
      beeApiUrl="<your-node-address>"
      stamp={"<your-stamp>"}
      privateKey={"<your-author-privetakey>"}
      identifier={"<your-deisred-topic>"}
    />
  </React.StrictMode>,
);
```

If the **privateKey** or **identifier** is not provided then they will be deduced from the url by default.

### Way of working

**SwarmCommentSystem** is simple React application using the **@solarpunkltd/comment-system** library. The comment feed
identifier and signer has to be deterministically derived and publicly available for the users.

### Comments

### Reading

During startup the **loadLatestComments** function is called to read the most recent comments of the feed:

```javascript
const newComments = await loadLatestComments(identifier, signerAddress, beeApiUrl, numOfComments);
```

It reads the next feed index and last comment, then reads the previous, at most **numOfComments**, on the feed. This way
a history can be loaded during scrolling up, for example, by decrementing the feed index until it reaches the very first
comment.

Then **loadNextComments** can be called periodically to fetch the latest feed update which can be compared to the
current state. If the latest index is bigger then the current one, then the state is simply appended with, at most
**numOfComments**, new comments.

```javascript
const newComments = await loadNextComments(comments.length, identifier, signerAddress, beeApiUrl, numOfComments);
```

### Writing

Upon clicking the **Submit** button, the form is validated and the comment is written to the latest feed index. To be
able to achieve this, first the latest index is retrieved, then the comment is written to the next index. However, in
the meantime other comments can arrive to the feed making our update invalid, as the index can be already taken. Because
of this, a sanity check takes place after each write to verify that indeed our comment lives on the expected index. If
not, then a retry mechanism is implemented, which simply tries to write the comment to the latest index the same way
before, by clicking on the **Try again** button. If the update is verified then comment state can be simply appended.

### Reactions

After the comments are loaded, their correspoding reactions can be retrieved asynchronously. The feed of the reactions
are identified by their **targetMessageId**, which are simply the **comment.message.messageId** properties. This allowes
a simply mapping between them. Their state is always stored in the latest feed udpate and can be aggregated before each
write operation using the **updateReactions** utility function. A sanity check and retry mechanism can also be
implemented similarly to the comments.

## Recommended Usage

Upload the `js` file to the Swarm network, and refer that instead of the CDN.

## Etherjot

This web component is also available as an extension in [Etherjot](https://github.com/ethersphere/etherjot-web).
