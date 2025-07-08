#!/usr/bin/env sh
# Copyright (c) 2025 Kiril Strezikozin
#
# SPDX-License-Identifier: MIT
#
# You may not use this file except in compliance with the MIT license terms.

# Execute on a JSON payload from Trello action to
# create an example payload to use for testing.

if ! command -v jq >/dev/null 2>&1; then
    echo "jq command not found"
    exit 1
fi

filtered=$(
    jq '
({
    data: .action.data,
    type: .action.type,
    translationKey: .action.display.translationKey
} 
+ (if .action | has("member") then {member: .action.member} else {} end)
+ (if .action | has("plugin") then {plugin: .action.plugin} else {} end))
|
walk(
    if type == "object" then
        (
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
        ) |
        (if has("name") then .name = "test" else . end) |
        (if has("desc") then .desc = "test" else . end) |
        (if has("text") then .text = "test" else . end) |
        (if has("id") then .id = "1234567890" else . end) |
        (if has("idShort") then .idShort = 123 else . end) |
        (if has("locale") then .locale = "en-us" else . end) |
        (if has("overview") then .overview = "test" else . end) |
        (if has("shortLink") then .shortLink = "abc" else . end) |
        (if has("idCard") then .idCard = "1234567890"  else . end) |
        (if has("idList") then .idList = "1234567890"  else . end) |
        (if has("description") then .description = "test" else . end) |
        (if has("idMember") then .idMember = "1234567890" else . end) |
        (if has("idLabels") then .idLabels |= map("1234567890") else . end) |
        (if has("idAttachment") then .idAttachment = "1234567890" else . end) |
        (if has("idMemberAdded") then .idMemberAdded = "1234567890" else . end) |
        (if has("avatarHash") then .avatarHash = "abc1234567890abc" else . end) |
        (if has("idAttachmentCover") then .idAttachmentCover = "1234567890" else . end) |
        (if has("idOrganizationOwner") then .idOrganizationOwner = "1234567890" else . end)
    else
        .
    end
)'
)

echo "${filtered}"
