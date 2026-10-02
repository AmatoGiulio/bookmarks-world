import { useEffect, useState } from 'react'
import type { SpaceObject } from '../space/spaceTypes'

type Props = {
  object: SpaceObject
}

type GitHubRepo = {
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
  description: string | null
  default_branch: string
  pushed_at: string
}

function RepoLiveView({ object }: Props) {
  const [repo, setRepo] = useState<GitHubRepo | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!object.repoFullName) return

    const controller = new AbortController()

    fetch(`https://api.github.com/repos/${object.repoFullName}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error('GitHub request failed')
        return response.json() as Promise<GitHubRepo>
      })
      .then(setRepo)
      .catch((error: unknown) => {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return
        }
        setFailed(true)
      })

    return () => controller.abort()
  }, [object.repoFullName])

  return (
    <div className="living-focus living-focus--repo">
      <div className="living-repo__top">
        <span>GitHub / {object.repoFullName ?? object.title}</span>
        <i />
      </div>

      <div className="living-repo__body">
        <h3>{object.title}</h3>
        <p>
          {repo?.description ??
            object.meta ??
            'Repository preview'}
        </p>

        <div className="living-repo__stats">
          <span>
            <strong>{repo?.stargazers_count ?? '—'}</strong>
            stars
          </span>
          <span>
            <strong>{repo?.forks_count ?? '—'}</strong>
            forks
          </span>
          <span>
            <strong>{repo?.open_issues_count ?? '—'}</strong>
            issues
          </span>
        </div>

        <div className="living-repo__footer">
          <span>{repo?.language ?? 'TypeScript'}</span>
          <span>
            {failed
              ? 'live metadata unavailable'
              : repo
                ? `branch · ${repo.default_branch}`
                : 'loading live metadata…'}
          </span>
        </div>
      </div>
    </div>
  )
}

function VideoLiveView({ object }: Props) {
  if (!object.embedUrl) {
    return (
      <StaticLiveView object={object} />
    )
  }

  return (
    <div className="living-focus living-focus--video">
      <iframe
        src={object.embedUrl}
        title={object.title}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

function StaticLiveView({ object }: Props) {
  if (object.image) {
    return (
      <div className="living-focus living-focus--image">
        <img src={object.image} alt="" />
      </div>
    )
  }

  return (
    <div
      className={`living-focus living-focus--generated living-focus--${object.kind}`}
      style={{ background: object.accent ?? '#d8d5cc' }}
    >
      <span>{object.source ?? object.kind}</span>
      <strong>{object.title}</strong>
      <small>{object.subtitle}</small>
    </div>
  )
}

export function LivingFocusContent({ object }: Props) {
  if (object.kind === 'repo') {
    return <RepoLiveView object={object} />
  }

  if (object.kind === 'video') {
    return <VideoLiveView object={object} />
  }

  return <StaticLiveView object={object} />
}
