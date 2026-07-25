# Followers Count Correction

## Goal

The Social Media Performance card must display the approved Followers value as
`546+`.

## Design

Keep the canonical metric value numeric (`546`) and retain `+` as the metric
suffix. The existing formatter will combine them into `546+`; no component or
formatting behavior needs to change.

Correct the inconsistent follower expectations in the journey-data and
reduced-motion component tests. Preserve all other in-progress social-profile
and engagement changes in the working tree.

## Verification

Run the focused journey-data and Social Media Performance test files, then run
the broader project test suite. The focused assertions must confirm that both
formatted and reduced-motion UI output show `546+`.
