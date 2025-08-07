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

filtered=$(./scripts/json-x-sanitize.sh)

filtered=$(
    echo "${filtered}" |
        jq '
({
    id: .action.id,
    data: .action.data,
    type: .action.type,
    translationKey: .action.display.translationKey
} 
+ (if .action | has("member") then {member: .action.member} else {} end))'
)

echo "${filtered}"
