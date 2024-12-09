# Swarm Comment System web component

This is an embeddable widget that can be added to any HTML page. It renders a decentralised discussion system where everybody can comment in tree structure.

## Swarm network

Swarm is a peer-to-peer network of Bee nodes that collectively provide censorship resistant decentralised storage and communication services.
<!-- TODO: fix and extend readme -->
## Example Usage

```
<div id="comments"></div>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swarm-comment-system-ui@1.1.0/dist/style.css">
<script src="https://cdn.jsdelivr.net/npm/swarm-comment-system-ui@1.1.0"></script>
<script>
    window.SwarmCommentSystem.renderSwarmComments('comments')
</script>
```

## Recommended Usage

Upload the `js` file to the Swarm network, and refer that instead of the CDN.

## Etherjot

This web component is also available as an extension in [Etherjot](https://github.com/ethersphere/etherjot-web).
