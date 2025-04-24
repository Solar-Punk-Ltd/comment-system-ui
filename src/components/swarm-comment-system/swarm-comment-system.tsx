import { useEffect, useRef, useState } from "react";
import { Bee, FeedIndex, PrivateKey } from "@ethersphere/bee-js";
import { readSingleComment, UserComment, writeCommentToIndex } from "@solarpunkltd/comment-system";

import { loadLatestComments, loadNextComments } from "../../utils/comments";
import { DEFAULT_BEE_API_URL } from "../../utils/constants";
import { isEmpty } from "../../utils/helpers";
import { Tabs } from "../tabs/tabs";

import SwarmCommentForm from "./swarm-comment-form/swarm-comment-form";
import SwarmCommentList, { SwarmCommentWithFlags } from "./swarm-comment-list/swarm-comment-list";

/**
 * Props for the SwarmCommentSystem component.
 */
export interface SwarmCommentSystemProps {
  /**
   * Postage stamp ID. If omitted, the first available stamp will be used.
   */
  stamp?: string;
  /**
   * Resource identifier. If not sepcified it's calculated from the bzz path or hashed from the url.
   */
  identifier?: string;
  /**
   * The URL of the Bee node.
   */
  beeApiUrl?: string;
  /**
   * The signer's private key
   */
  privateKey?: string | PrivateKey;
  /**
   * Maximum number of comments to load per request. Defaults to DEFAULT_NUM_OF_COMMENTS.
   */
  numOfComments?: number;
  /**
   * Maximum number of characters for a comment.
   */
  maxCharacterCount?: number;
  /**
   * Custom CSS classes.
   */
  classes?: {
    wrapper?: string;
    form?: string;
    tabs?: string;
    comments?: string;
  };
}

export function SwarmCommentSystem(props: SwarmCommentSystemProps) {
  const { stamp, privateKey, classes, beeApiUrl, identifier, numOfComments, maxCharacterCount } = props;

  const [batchId, setBatchId] = useState<string | undefined>(undefined);
  const [comments, setComments] = useState<SwarmCommentWithFlags[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const sending = useRef<boolean>(undefined);

  const signer = privateKey ? new PrivateKey(privateKey) : undefined;
  const signerAddress = signer?.publicKey().address().toString();

  // if resend is succesful then find, remove and push the currently error-flagged comment to the end of the list
  const onResend = (comment: SwarmCommentWithFlags) => {
    if (!comments) {
      return;
    }

    const foundIX = comments.findIndex(
      c => c.error && c.message.text === comment.message.text && c.message.messageId === comment.message.messageId,
    );
    if (foundIX > -1) {
      console.log(`Removing failed comment at index: ${foundIX}`);
      const tmpComments = [...comments];
      tmpComments.splice(foundIX, 1);
      tmpComments.push({
        ...comment,
        error: false,
      });
      setComments(tmpComments);
    }
  };

  // only add failed comments to the list, if not already present
  const onFailure = (comment: SwarmCommentWithFlags) => {
    if (!comments) {
      return;
    }

    const foundIX = comments.findIndex(
      c => c.error && c.message.text === comment.message.text && c.message.messageId === comment.message.messageId,
    );
    if (foundIX < 0) {
      const tmpComments = [...comments];
      tmpComments.push({
        ...comment,
        error: true,
      });
      setComments(tmpComments);
    }
  };

  const sendComment = async (comment: SwarmCommentWithFlags) => {
    if (sending.current || !batchId) {
      return;
    }

    sending.current = true;

    try {
      setFormLoading(true);

      // trying to write to the next known index
      const lastComment = await readSingleComment(undefined, {
        identifier,
        beeApiUrl,
        address: signerAddress,
      });

      const expNextIx =
        lastComment?.nextIndex !== undefined ? new FeedIndex(lastComment.nextIndex) : FeedIndex.fromBigInt(0n);
      const plainCommentReq: UserComment = {
        message: { ...comment.message },
        timestamp: comment.timestamp,
        user: { username: comment.user.username, address: signerAddress || "bagoy" },
      };

      const newComment = await writeCommentToIndex(plainCommentReq, expNextIx, {
        stamp: batchId,
        identifier,
        signer,
        beeApiUrl,
      });

      if (isEmpty(newComment)) {
        throw "Comment write failed, empty response!";
      }
      // need to check if the comment was written successfully to the expected index
      // nexitIx will be undefined if index is defined
      const commentCheck = await readSingleComment(expNextIx, {
        identifier,
        beeApiUrl,
        address: signerAddress,
      });

      if (
        isEmpty(commentCheck) ||
        commentCheck?.comment?.message?.text !== comment.message.text ||
        commentCheck?.comment?.timestamp !== comment.timestamp
      ) {
        // if another comment is found at the expected index then updateNextCommentsCb shall find it and update the list
        throw `comment check failed, expected "${comment.message.text}", got: "${commentCheck?.comment.message.text}".
                Expected timestamp: ${comment.timestamp}, got: ${commentCheck?.comment.timestamp}`;
      }
      console.log(`Writing a new comment to index ${expNextIx} was successful: `, newComment);

      if (comment.error === true) {
        onResend(comment);
      } else {
        setComments(prevComments => [...(prevComments || []), comment]);
      }

      sending.current = false;
      setFormLoading(false);
    } catch (err) {
      sending.current = false;
      onFailure(comment);
      setFormLoading(false);
      throw err;
    }
  };

  useEffect(() => {
    if (stamp) {
      setBatchId(stamp);
      return;
    }

    const getStamp = async (): Promise<void> => {
      try {
        const bee = new Bee(beeApiUrl || DEFAULT_BEE_API_URL);
        const stamps = (await bee.getAllPostageBatch()).filter(s => s.usable);
        setBatchId(stamps[0]?.batchID.toString());
      } catch (err) {
        console.error("Failed to get postage stamp: ", err);
      }
    };

    getStamp();
  }, [stamp, beeApiUrl]);

  useEffect(() => {
    // Loads comments for the given identifier
    const loadComments = async (): Promise<void> => {
      setLoading(true);
      try {
        const newComments = await loadLatestComments(identifier, signerAddress, beeApiUrl, numOfComments);

        if (!isEmpty(newComments)) {
          setComments(newComments.comments);
          console.log(`Loaded ${newComments.comments.length} comments of identifier ${identifier}`);
        } else {
          setComments([]);
          console.log(`No comments found for identifier ${identifier}`);
        }
      } catch (err) {
        console.error("Loading comments error: ", err);
      }
      setLoading(false);
    };

    loadComments();
  }, [signerAddress, beeApiUrl, identifier, numOfComments]);

  if (loading) {
    return <div className={classes?.wrapper}>Loading comments...</div>;
  }

  return comments === null ? (
    <div className={classes?.wrapper}>Couldn't load comments</div>
  ) : (
    <div className={classes?.wrapper}>
      <SwarmCommentForm
        className={classes?.form}
        onSubmit={sendComment}
        loading={loading || formLoading}
        maxCharacterCount={maxCharacterCount}
      />
      <button
        className={`${classes?.wrapper}-next-button`}
        onClick={async () => {
          const newComments = await loadNextComments(
            comments.length,
            identifier,
            signerAddress,
            beeApiUrl,
            numOfComments,
          );

          if (!isEmpty(newComments)) {
            setComments(prevComments => [...(prevComments || []), ...newComments.comments]);
            console.log(`Loaded ${newComments.comments.length} more comments of identifier ${identifier}`);
          }
        }}
      >
        Load more
      </button>
      <Tabs
        activeTab={0}
        className={classes?.tabs}
        disabled={[loading, formLoading]}
        tabs={["Comments"]}
        onTabChange={() => {}}
      >
        <SwarmCommentList
          className={classes?.comments}
          comments={comments || []}
          resend={sendComment}
          loading={loading}
        />
      </Tabs>
    </div>
  );
}
