# 3.0.0-beta.1

- Added Annualizer section.
- Added multi-mortgage Home Loans section.
- Added daily mortgage projection with dated credits, debits and interest-rate changes.
- Added recurring weekly, fortnightly and monthly mortgage events.
- Added collapsible year/month schedule view.
- Added v2 local-data migration and backup compatibility.

# Changelog

## v2.0.0-beta.1
- Added Bills tab.
- Added Add Bill form.
- Added Annual Bills card.
- Added Monthly Bills card.
- Added bill template save/select.
- Added edit/delete for bills.

## v1.x
- Dashboard.
- Pay Cards.
- Expense templates.
- Import/export.
- PWA support.
- Collapsible pay cards.


## v2.0.0-beta.2
- Grouped Monthly Bills into month cards.
- Grouped Annual Bills into year cards.
- Added per-period bill count and total.

## v2.0.0-beta.3
- Added collapsible bill period cards.
- Added Fortnightly bill frequency.
- Added Quarterly bill frequency.
- Added Fortnightly Bills and Quarterly Bills sections.
- Fortnightly bills are grouped by month.
- Quarterly bills are grouped by quarter.


## v2.1.0-beta.1
### Added
- Paid/unpaid tracking for Monthly, Quarterly and Annual bills.
- Paid date recording.
- Outstanding totals that exclude paid bills.
- Progress bars for tracked bill periods.
- Duplicate-to-next-period action.
- Only recurring bills are copied.
- Duplicate detection by bill name within the target period.
- Completed Monthly, Quarterly and Annual period cards are hidden.

### Kept simple
- Fortnightly Bills remain a reference list without paid tracking or duplication.


## v2.2.0-beta.1
### Added
- Plan a Monthly, Quarterly or Annual bill into an active Pay Card.
- Planned bills show the selected pay date.
- Changing the planned pay moves the linked expense.
- Removing a plan removes the linked expense from the Pay Card.
- Linked Pay Card expenses retain the bill due date.

### Changed
- Replaced the bill Edit pencil with the primary Plan action.
- Fortnightly Bills remain reference-only and cannot be planned.


## v2.2.0-beta.2
### Changed
- Replaced experimental Bill → Pay Card planning with independent Planned and Paid states.
- Added planned date recording.
- Added separate Planning and Payment progress bars.
- Added Unplanned and Outstanding counts to each tracked period.
- Restored bill Edit action.
- Monthly, Quarterly and Annual periods still disappear once fully paid.

### Kept simple
- Fortnightly Bills remain a reference list without Planned or Paid states.


## v2.2.1-beta.1
### Changed
- Refreshed the Bills interface for a cleaner mobile layout.
- Moved Planned and Paid actions into each bill's three-dot menu.
- Added compact visual status bars for Planned and Paid.
- Kept paid bills dimmed.
- Added circular bill initials and more compact bill rows.
- Added a mobile bottom navigation bar.
- Restyled period cards, progress bars and action buttons.


## v2.2.2-beta.1
### Changed
- Matched the Bills page more closely to the reference design.
- Added four period summary tiles.
- Increased card spacing, typography and button sizing.
- Added varied bill avatar colours.
- Added Duplicate to Next Period inside the bill action menu.
- Added Add Bill link within each tracked period card.
- Refined mobile bottom navigation sizing.

## v2.2.3-beta.1
- Bill due dates no longer show the year inside period cards.
- Reduced bill-title font size.
- Long bill names now wrap instead of truncating.
- Rebalanced bill-row widths to give titles more space.

## v2.3.0-beta.1
### Added
- Context-sensitive footer Add button.
- Expense action menus.
- Payment progress for each Pay Card.

### Changed
- Restyled Pay Cards to match the Bills design language.
- Added four Pay Card summary tiles.
- Modernised expense rows with category-coloured avatars.
- Moved expense paid/delete controls into three-dot menus.
- Added compact payment status indicators.


## v2.3.1-beta.1
### Changed
- Reduced Pay Card summary tile sizes.
- Reduced Pay Card heading, button and value font sizes.
- Reduced expense row height and padding.
- Reduced expense avatar, status and action sizes.
- Matched Pay Card information density more closely to Bills.


## v2.3.1-beta.2
### Fixed
- Added stylesheet cache-busting so GitHub Pages and the installed PWA load the new Pay Card sizing.
- Added definitive compact Pay Card overrides to prevent older mobile rules from taking precedence.


## v2.3.2-beta.1
### Changed
- Removed the redundant whole-app Expected Pay, Expenses, Net Remaining and Active Pays summary.
- Added a permanent More button to the mobile footer.
- Moved Export and Import into a mobile bottom sheet accessible from every section.

## v2.3.3-beta.1
### Fixed
- Prevented Pay Card expense text and amounts from overflowing their cards.
- Added stricter grid sizing and width constraints.
- Improved wrapping for long expense names.
- Reduced mobile column widths for narrow screens.


## v2.4.0-beta.1
### Changed
- Rebuilt the Pay Cards renderer with a clean component structure.
- Replaced the conflicting legacy grid with a predictable flex layout for expenses.
- Matched Pay Card spacing, typography and information density to Bills.
- Preserved all existing Pay Card data and behaviours.
