# Error Handling
@doc-version: 16.1.6
@last-updated: 2026-02-20


Errors can be divided into two categories: [expected errors](#handling-expected-errors) and [uncaught exceptions](#handling-uncaught-exceptions). This page will walk you through how you can handle these errors in your Next.js application.

## Handling expected errors

Expected errors are those that can occur during the normal operation of the application, such as those from [server-side form validation](/docs/app/guides/forms) or failed requests. These errors should be handled explicitly and returned to the client.

### Server Functions

You can use the [`useActionState`](https://react.dev/reference/react/useActionState) hook to handle expected errors in [Server Functions](https://react.dev/reference/rsc/server-functions).

For these errors, avoid using `try`/`catch` blocks and throw errors. Instead, model expected errors as return values.

```ts filename="app/actions.ts" switcher
'use server'

export async function createPost(prevState: any, formData: FormData) {
  const title = formData.get('title')
  const content = formData.get('content')

  const res = await fetch('https://api.vercel.app/posts', {
    method: 'POST',
    body: { title, content },
  })
  const json = await res.json()

  if (!res.ok) {
    return { message: 'Failed to create post' }
  }
}
```

```js filename="app/actions.js" switcher
'use server'

export async function createPost(prevState, formData) {
  const title = formData.get('title')
  const content = formData.get('content')

  const res = await fetch('https://api.vercel.app/posts', {
    method: 'POST',
    body: { title, content },
  })
  const json = await res.json()

  if (!res.ok) {
    return { message: 'Failed to create post' }
  }
}
```

You can pass your action to the `useActionState` hook and use the returned `state` to display an error message.

```tsx filename="app/ui/form.tsx" highlight={11,19} switcher
'use client'

import { useActionState } from 'react'
import { createPost } from '@/app/actions'

const initialState = {
  message: '',
}

export function Form() {
  const [state, formAction, pending] = useActionState(createPost, initialState)

  return (
    <form action={formAction}>
      <label htmlFor="title">Title</label>
      <input type="text" id="title" name="title" required />
      <label htmlFor="content">Content</label>
      <textarea id="content" name="content" required />
      {state?.message && <p aria-live="polite">{state.message}</p>}
      <button disabled={pending}>Create Post</button>
    </form>
  )
}
```

```jsx filename="app/ui/form.js" highlight={11,19} switcher
'use client'

import { useActionState } from 'react'
import { createPost } from '@/app/actions'

const initialState = {
  message: '',
}

export function Form() {
  const [state, formAction, pending] = useActionState(createPost, initialState)

  return (
    <form action={formAction}>
      <label htmlFor="title">Title</label>
      <input type="text" id="title" name="title" required />
      <label htmlFor="content">Content</label>
      <textarea id="content" name="content" required />
      {state?.message && <p aria-live="polite">{state.message}</p>}
      <button disabled={pending}>Create Post</button>
    </form>
  )
}
```

### Server Components

When fetching data inside of a Server Component, you can use the response to conditionally render an error message or [`redirect`](/docs/app/api-reference/functions/redirect).

```tsx filename="app/page.tsx" switcher
export default async function Page() {
  const res = await fetch(`https://...`)
  const data = await res.json()

  if (!res.ok) {
    return 'There was an error.'
  }

  return '...'
}
```

```jsx filename="app/page.js" switcher
export default async function Page() {
  const res = await fetch(`https://...`)
  const data = await res.json()

  if (!res.ok) {
    return 'There was an error.'
  }

  return '...'
}
```

### Not found

You can call the [`notFound`](/docs/app/api-reference/functions/not-found) function within a route segment and use the [`not-found.js`](/docs/app/api-reference/file-conventions/not-found) file to show a 404 UI.

```tsx filename="app/blog/[slug]/page.tsx" switcher
import { getPostBySlug } from '@/lib/posts'

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return <div>{post.title}</div>
}
```

```jsx filename="app/blog/[slug]/page.js" switcher
import { getPostBySlug } from '@/lib/posts'

export default async function Page({ params }) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return <div>{post.title}</div>
}
```

```tsx filename="app/blog/[slug]/not-found.tsx" switcher
export default function NotFound() {
  return <div>404 - Page Not Found</div>
}
```

```jsx filename="app/blog/[slug]/not-found.js" switcher
export default function NotFound() {
  return <div>404 - Page Not Found</div>
}
```

## Handling uncaught exceptions

Uncaught exceptions are unexpected errors that indicate bugs or issues that should not occur during the normal flow of your application. These should be handled by throwing errors, which will then be caught by error boundaries.

### Nested error boundaries

Next.js uses error boundaries to handle uncaught exceptions. Error boundaries catch errors in their child components and display a fallback UI instead of the component tree that crashed.

Create an error boundary by adding an [`error.js`](/docs/app/api-reference/file-conventions/error) file inside a route segment and exporting a React component:

```tsx filename="app/dashboard/error.tsx" switcher
'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </button>
    </div>
  )
}
```

```jsx filename="app/dashboard/error.js" switcher
'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </button>
    </div>
  )
}
```

Errors will bubble up to the nearest parent error boundary. This allows for granular error handling by placing `error.tsx` files at different levels in the [route hierarchy](/docs/app/getting-started/project-structure#component-hierarchy).

![Nested Error Component Hierarchy](https://h8DxKfmAPhn8O0p3.public.blob.vercel-storage.com/docs/light/nested-error-component-hierarchy.png)

Error boundaries don’t catch errors inside event handlers. They’re designed to catch errors [during rendering](https://react.dev/reference/react/Component#static-getderivedstatefromerror) to show a **fallback UI** instead of crashing the whole app.

In general, errors in event handlers or async code aren’t handled by error boundaries because they run after rendering.

To handle these cases, catch the error manually and store it using `useState` or `useReducer`, then update the UI to inform the user.

```tsx
'use client'

import { useState } from 'react'

export function Button() {
  const [error, setError] = useState(null)

  const handleClick = () => {
    try {
      // do some work that might fail
      throw new Error('Exception')
    } catch (reason) {
      setError(reason)
    }
  }

  if (error) {
    /* render fallback UI */
  }

  return (
    <button type="button" onClick={handleClick}>
      Click me
    </button>
  )
}
```

Note that unhandled errors inside `startTransition` from `useTransition`, will bubble up to the nearest error boundary.

```tsx
'use client'

import { useTransition } from 'react'

export function Button() {
  const [pending, startTransition] = useTransition()

  const handleClick = () =>
    startTransition(() => {
      throw new Error('Exception')
    })

  return (
    <button type="button" onClick={handleClick}>
      Click me
    </button>
  )
}
```

### Global errors

While less common, you can handle errors in the root layout using the [`global-error.js`](/docs/app/api-reference/file-conventions/error#global-error) file, located in the root app directory, even when leveraging [internationalization](/docs/app/guides/internationalization). Global error UI must define its own `<html>` and `<body>` tags, since it is replacing the root layout or template when active.

```tsx filename="app/global-error.tsx" switcher
'use client' // Error boundaries must be Client Components

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    // global-error must include html and body tags
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  )
}
```

```jsx filename="app/global-error.js" switcher
'use client' // Error boundaries must be Client Components

export default function GlobalError({ error, reset }) {
  return (
    // global-error must include html and body tags
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  )
}
```
## API Reference

Learn more about the features mentioned in this page by reading the API Reference.

- [redirect](/docs/app/api-reference/functions/redirect)
  - API Reference for the redirect function.
- [error.js](/docs/app/api-reference/file-conventions/error)
  - API reference for the error.js special file.
- [notFound](/docs/app/api-reference/functions/not-found)
  - API Reference for the notFound function.
- [not-found.js](/docs/app/api-reference/file-conventions/not-found)
  - API reference for the not-found.js file.

---

For an overview of all available documentation, see [/docs/llms.txt](/docs/llms.txt)


Prerender Error with Next.js
Why This Error Occurred

While prerendering a page during next build, an error occurred. This can happen for various reasons, including:

    Incorrect file structure or non-page files in the pages/ directory
    Expecting props to be populated which are not available during prerendering
    Using browser-only APIs in components without proper checks
    Incorrect configuration in getStaticProps or getStaticPaths

Possible Ways to Fix It
1. Ensure correct file structure and use App Router for colocation
Pages Router

In the Pages Router, only special files are allowed to generate pages. You cannot colocate other files (e.g., components, styles) within the pages directory.

Correct structure:

  .
  ├── components/
  │   └── Header.js
  ├── pages/
  │   ├── about.js
  │   └── index.js
  └── styles/
      └── globals.css

App Router (Next.js 13+)

The App Router allows colocation of pages and other files in the same folder. This provides a more intuitive project structure.

Example folder structure:

  .
  └── app/
      ├── about/
      │   └── page.tsx
      ├── blog/
      │   ├── page.tsx
      │   └── PostCard.tsx
      ├── layout.tsx
      └── page.tsx

2. Handle undefined props and missing data
Pages Router

For the Pages Router, use conditional checks and return appropriate props or a 404 page:

export async function getStaticProps(context) {
  const data = await fetchData(context.params.id)
  if (!data) {
    return {
      notFound: true,
    }
  }
  return {
    props: { data },
  }
}

3. Handle fallback in dynamic routes

If you're using fallback: true or fallback: 'blocking' in getStaticPaths, ensure your page component can handle the loading state:

import { useRouter } from 'next/router'

function Post({ post }) {
  const router = useRouter()

  if (router.isFallback) {
    return <div>Loading...</div>
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}

4. Avoid exporting pages with server-side rendering

If you're using next export or output: 'export' in your next.config.js, ensure that none of your pages use getServerSideProps. Instead, use getStaticProps for data fetching:

export async function getStaticProps() {
  const res = await fetch('https://api.vercel.app/blog')
  const data = await res.json()

  return {
    props: { data },
    revalidate: 60,
  }
}

5. Disable server-side rendering for components using browser APIs

If a component relies on browser-only APIs like window, you can disable server-side rendering for that component:

import dynamic from 'next/dynamic'

const DynamicComponentWithNoSSR = dynamic(
  () => import('../components/BrowserOnlyComponent'),
  { ssr: false }
)

export default function Page() {
  return (
    <div>
      <h1>My page</h1>
      <DynamicComponentWithNoSSR />
    </div>
  )
}

Debugging

For additional debugging information when troubleshooting prerender errors, you can run:

next build --debug-prerender

This provides unminified stack traces with source maps, making it easier to pinpoint the exact component and route causing the issue.
Additional Resources

    Handling Errors in Next.js
    Data Fetching in Next.js
    Debugging prerender errors

If you continue to experience issues after trying these solutions, consider checking your server logs for more detailed error messages or reaching out to the Next.js community for support.
