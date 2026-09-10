# VIP Category Pack Design

## Scope

Add twelve currently-free VIP-labelled categories: childhood cartoons, gaming, cars, world football, flags, riddles, medicine, inventions, Ramadan nostalgia, celebrities, strange animals, and travel.

Each category receives an original card illustration and fifteen stable Arabic questions stored through the existing question seed and Neon workflow. The existing balanced random sampler remains responsible for question distribution.

## Card system

Card artwork is original and does not reproduce Kalak assets. Every card is a self-contained SVG image with its raster artwork and Arabic title embedded inside it. Title position, line breaks, size, and alignment are configured per card to respect the illustration's negative space. Titles use warm white, a heavy navy outline, and an orange drop shadow. A small VIP marker and the existing add/remove state remain interface overlays.

## Availability

VIP cards are selectable by every player for now. The VIP label is metadata and visual treatment only; it does not enforce payment or entitlement checks in this release.

## Validation

Validate all category IDs across TypeScript, question generation, API limits, database seed output, balanced random selection, desktop and mobile rendering, full test suite, production build, deployment, and a production screenshot pass.
