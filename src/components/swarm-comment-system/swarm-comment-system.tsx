import { useEffect, useState } from "react";
import { FeedIndex, PrivateKey } from "@ethersphere/bee-js";
import { readSingleComment, UserComment, writeCommentToIndex } from "@solarpunkltd/comment-system";

import { loadLatestComments } from "../../utils/comments";
import { CATEGORIES } from "../../utils/constants";
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
   * Resource identifier. If not sepcified it's calculated from bzz path.
   */
  identifier?: string;
  /**
   * The URL of the Bee node.
   */
  beeApiUrl?: string;
  /**
   * The address of the feed that contains approved comments.
   */
  approvedFeedAddress?: string;
  /**
   * The signer's private key
   */
  privatekey: string | PrivateKey;
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
  const { stamp, privatekey, approvedFeedAddress, classes, beeApiUrl, identifier, numOfComments, maxCharacterCount } =
    props;
  const [comments, setComments] = useState<SwarmCommentWithFlags[] | null>(null);
  const [category, setCategory] = useState<CATEGORIES>(CATEGORIES.APPROVED);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const signer = new PrivateKey(privatekey);

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
    try {
      setFormLoading(true);

      // trying to write to the next known index
      const lastComment = await readSingleComment(undefined, {
        identifier,
        beeApiUrl,
        approvedFeedAddress: signer.publicKey().address().toString(),
      });
      const expNextIx =
        lastComment.nextIndex !== undefined ? new FeedIndex(lastComment.nextIndex) : FeedIndex.fromBigInt(0n);
      const plainCommentReq: UserComment = {
        message: { ...comment.message },
        timestamp: comment.timestamp,
        username: comment.username,
      };

      const newComment = await writeCommentToIndex(plainCommentReq, FeedIndex.fromBigInt(0n), {
        stamp,
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
        approvedFeedAddress: signer.publicKey().address().toString(),
      });

      if (
        isEmpty(commentCheck) ||
        commentCheck.comment.message.text !== comment.message.text ||
        commentCheck.comment.timestamp !== comment.timestamp
      ) {
        // if another comment is found at the expected index then updateNextCommentsCb shall find it and update the list
        throw `comment check failed, expected "${comment.message.text}", got: "${commentCheck.comment.message.text}".
                Expected timestamp: ${comment.timestamp}, got: ${commentCheck.comment.timestamp}`;
      }
      console.log(`Writing a new comment to index ${expNextIx} was successful: `, newComment);

      if (comment.error === true) {
        onResend(comment);
      } else {
        setComments(prevComments => [...(prevComments || []), comment]);
      }
      setFormLoading(false);
    } catch (err) {
      onFailure(comment);
      setFormLoading(false);
      throw err;
    }
  };

  useEffect(() => {
    // Loads comments for the given identifier
    const loadComments = async (): Promise<void> => {
      setLoading(true);
      try {
        const newComments = await loadLatestComments(
          identifier,
          // category === CATEGORIES.APPROVED ? approvedFeedAddress : signer.publicKey().address().toString(),
          signer.publicKey().address().toString(),
          beeApiUrl,
          numOfComments,
        );

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
  }, [approvedFeedAddress, beeApiUrl, identifier, numOfComments, category]);

  return !loading && comments === null ? (
    <div>Couldn't load comments</div>
  ) : (
    <div className={classes?.wrapper}>
      <SwarmCommentForm
        className={classes?.form}
        onSubmit={sendComment}
        loading={loading || formLoading}
        maxCharacterCount={maxCharacterCount}
      />
      <Tabs
        activeTab={category === CATEGORIES.APPROVED ? 0 : 1}
        className={classes?.tabs}
        disabled={[loading, formLoading]}
        tabs={approvedFeedAddress ? ["Author Selected", "All"] : ["All"]}
        onTabChange={tab => setCategory(tab === 0 ? CATEGORIES.APPROVED : CATEGORIES.ALL)}
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
