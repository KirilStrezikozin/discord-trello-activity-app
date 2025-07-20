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
    id: .action.id,
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
        (if has("name") and .name != null then .name = "test" else . end) |
        (if has("desc") and .desc != null then .desc = "test" else . end) |
        (if has("text") and .text != null then .text = "test" else . end) |
        (if has("id") and .id != null then .id = "1234567890" else . end) |
        (if has("idShort") and .idShort != null then .idShort = 123 else . end) |
        (if has("locale") and .locale != null then .locale = "en-us" else . end) |
        (if has("overview") and .overview != null then .overview = "test" else . end) |
        (if has("shortLink") and .shortLink != null then .shortLink = "abc" else . end) |
        (if has("idCard") and .idCard != null then .idCard = "1234567890"  else . end) |
        (if has("idList") and .idList != null then .idList = "1234567890"  else . end) |
        (if has("description") and .description != null then .description = "test" else . end) |
        (if has("idMember") and .idMember != null then .idMember = "1234567890" else . end) |
        (if has("idLabels") and .idLabels != null then .idLabels |= map("1234567890") else . end) |
        (if has("idAttachment") and .idAttachment != null then .idAttachment = "1234567890" else . end) |
        (if has("idMemberAdded") and .idMemberAdded != null then .idMemberAdded = "1234567890" else . end) |
        (if has("avatarHash") and .avatarHash != null then .avatarHash = "abc1234567890abc" else . end) |
        (if has("idAttachmentCover") and .idAttachmentCover != null then .idAttachmentCover = "1234567890" else . end) |
        (if has("idOrganizationOwner") and .idOrganizationOwner != null then .idOrganizationOwner = "1234567890" else . end)
    else
        .
    end
)'
)

echo "${filtered}"
