#!/usr/bin/env sh
# Copyright (c) 2025 Kiril Strezikozin
#
# SPDX-License-Identifier: MIT
#
# You may not use this file except in compliance with the MIT license terms.

# Execute on a JSON payload to dummify sensitive data.

if ! command -v jq >/dev/null 2>&1; then
    echo "jq command not found"
    exit 1
fi

# `jq` command is used to filter a generic JSON payload from Trello by:
# 1. Hiding values of any keys containing "url" or "email" (case-insensitive).
# 2. Hiding values of any ID-like keys.
# 3. Replacing values of name, text, description keys with "test".

filtered=$(
    jq '
    walk(
      if type == "object" then
        reduce keys[] as $k (
          .;
          if ($k | ascii_downcase | contains("url")) then
            .[$k] = "https://example.com"
          elif ($k | ascii_downcase | contains("email")) then
            .[$k] = "myemail@myemail.com"
          else
            .
          end
        )
        | reduce {
            name: "test",
            desc: "test",
            text: "test",
            idShort: 123,
            initials: "TT",
            locale: "en-us",
            fullName: "test",
            overview: "test",
            shortLink: "abc",
            id: "1234567890",
            _id: "1234567890",
            description: "test",
            fileName: "test.png",
            idCard: "1234567890",
            idList: "1234567890",
            nodeId: "1234567890",
            idBoard: "1234567890",
            idMember: "1234567890",
            idPlugin: "1234567890",
            idChecklist: "1234567890",
            idAttachment: "1234567890",
            idMemberAdded: "1234567890",
            idOrganization: "1234567890",
            idMemberCreator: "1234567890",
            avatarHash: "abc1234567890abc",
            idAttachmentCover: "1234567890",
            idOrganizationOwner: "1234567890",
            idUploadedBackground: "1234567890"
          } as $replacements (
            .;
            reduce ($replacements | to_entries[]) as $item (
              .;
              if has($item.key) and .[$item.key] != null and
                 ((.[$item.key] | type) == ($item.value | type)) then
                .[$item.key] = $item.value
              else
                .
              end
            )
        )
        | reduce [
            "idLabels",
            "idMembers",
            "idChecklists",
            "idMembersVoted"
          ][] as $key (
            .;
            if has($key) and .[$key] != null then
              try (.[$key] |= map("1234567890")) catch .
            else
              .
            end
          )
      else
        .
      end
    )
  '
)

echo "${filtered}"
