import { Comment } from '@ethersphere/comment-system'

export interface SwarmCommentSystemProps {
  comments: Comment[]
}

export default function SwarmCommentList({
  comments
}: SwarmCommentSystemProps) {
  return (
    <div className={"swarm-comment-system-comment-list"}>
      {comments.map(({ user, data, timestamp }, index) => (
        <div key={index}>
          <p>
            <strong>{user}</strong> on {new Date(timestamp).toDateString()}
          </p>
          <p>{data}</p>
        </div>
      ))}
    </div>
  )
}
