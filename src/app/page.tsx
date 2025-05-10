/**
 * Copyright (c) 2025 Kiril Strezikozin
 *
 * SPDX-License-Identifier: MIT
 *
 * You may not use this file except in compliance with the MIT license terms.
 */

import { FileQuestion, MoveRight } from "lucide-react";

import { AppGuideUrl, AppSourceUrl, TrelloUrl } from "../lib/constants";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[64px] sm:gap-[32px] row-start-2 items-center justify-center sm:items-start sm:justify-start pb-32">
        <h1 className="text-center sm:text-left mb-4 text-5xl font-black">
          Trello Notifications in Discord
        </h1>
        <p className="text-center sm:text-left text-wrap max-w-xl">
          This is an API app that allows you to receive notifications about any activity happening in Trello in a Discord channel.
        </p>
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background font-semibold gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href={AppGuideUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get started
            <MoveRight className="stroke-[var(--background)]" />
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center sm:items-start sm:justify-start">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href={AppGuideUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileQuestion
            aria-hidden
            color="#666"
            strokeWidth={3}
            width={16}
            height={16}
          />
          <p>
            Usage guide
          </p>
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href={AppSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            role="img"
            fill="#666"
            width={16} height={16}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Gitlab</title>
            <path d="m23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 0 0-.3362-.405.8748.8748 0 0 0-.9997.0539.8748.8748 0 0 0-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 0 0-.29-.4412.8748.8748 0 0 0-.9997-.0537.8585.8585 0 0 0-.3362.4049L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 0 0 2.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.462 1.8633 1.4995 1.1321a1.0085 1.0085 0 0 0 1.2197 0l1.4995-1.1321 2.4619-1.8633 5.006-3.7489.0125-.01a6.0682 6.0682 0 0 0 2.0094-7.003z" />
          </svg>

          Source ↗

        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href={TrelloUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            role="img"
            fill="#666"
            width={16} height={16}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Trello</title>
            <path d="M21.147 0H2.853A2.86 2.86 0 000 2.853v18.294A2.86 2.86 0 002.853 24h18.294A2.86 2.86 0 0024 21.147V2.853A2.86 2.86 0 0021.147 0zM10.34 17.287a.953.953 0 01-.953.953h-4a.954.954 0 01-.954-.953V5.38a.953.953 0 01.954-.953h4a.954.954 0 01.953.953zm9.233-5.467a.944.944 0 01-.953.947h-4a.947.947 0 01-.953-.947V5.38a.953.953 0 01.953-.953h4a.954.954 0 01.953.953z" />
          </svg>

          Go to trello.com ↗

        </a>
      </footer>
    </div>
  );
}