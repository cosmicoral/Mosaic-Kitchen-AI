# Generation mascot poses

Five `.webp` files belong in this folder:

```
chef-planning-tablet.webp
chef-washing.webp
chef-stir-fry.webp
chef-tasting.webp
chef-plating.webp
```

## Convert before committing

The source illustrations are ~2 MB PNGs. They are displayed at roughly 220 px
and are **preloaded during a loading state**, so shipping them at source size
would mean downloading megabytes in order to show a spinner — worse than the
spinner. Convert first:

```bash
# brew install webp
for f in *.png; do
  cwebp -q 82 -resize 520 0 "$f" -o "${f%.png}.webp"
done
```

520 px wide covers a 2× display. Expect 40–70 KB each, ~300 KB for the set.

## Why five and not eight

Each pose maps to a stage the server genuinely performs:

| Stage | Pose |
| --- | --- |
| `analysing_profile` | planning with the tablet |
| `checking_pantry` | washing vegetables |
| `building_meals` | stir-frying — the model call, and the only long stage |
| `reviewing` | tasting — the allergen, cuisine, budget and arithmetic checks |
| `finalising` | plating — writing the plan to the database |

The remaining three poses are unused on purpose. Adding them would mean
inventing stages to justify them, and a drawn workflow that does not happen is
the same false claim as a written one.
