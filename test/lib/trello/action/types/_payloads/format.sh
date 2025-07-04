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
{
    data: .action.data,
    type: .action.type,
    translationKey: .action.display.translationKey
} 
|
walk(
    if type == "object" then
        (if has("name") then .name = "test" else . end) |
        (if has("desc") then .desc = "test" else . end) |
        (if has("id") then .id = "1234567890" else . end) |
        (if has("idShort") then .idShort = 123 else . end) |
        (if has("shortLink") then .shortLink = "abc" else . end) |
        (if has("idList") then .idList = "1234567890"  else . end) |
        (if has("idMember") then .idMember = "1234567890" else . end)
    else
        .
    end
)'
)

echo "${filtered}"
