# Multi-Account Operations And Finance

Last updated: 2026-04-28

## Purpose

This document defines the internal management layer for multiple Vinted accounts, stock, orders, and profit tracking.

## Principle

Multi-account support should be an internal control layer.

It should help the seller manage separate accounts safely.

It should not become a system for cloning the same listing across accounts automatically.

## Core entities

### Account profile

Represents one Vinted account managed inside the app.

Suggested fields:

- id
- display name
- region / country
- default language
- default price style
- default description preset
- notes
- active / archived

### Stock item

Represents one physical item owned by the seller.

Suggested fields:

- id
- SKU
- title or internal name
- storage location
- cost basis
- source notes
- assigned account id
- stock status

### Listing record

Represents the prepared Vinted listing state for one stock item.

Suggested fields:

- stock item id
- target account id
- listing content
- generated fields
- edited fields
- last filled on Vinted
- listing status

### Order / sale record

Represents a completed or in-progress sale event.

Suggested fields:

- order id
- stock item id
- account id
- sold date
- sale price
- buyer country
- order status
- shipping notes

### Expense record

Represents item-level or order-level costs.

Suggested fields:

- stock cost
- packaging cost
- transport cost
- other manual cost

## Core calculations

The finance layer should stay simple.

Per item:

- revenue
- total cost
- net profit
- margin percent

Per account:

- active stock count
- listed count
- sold count
- revenue
- profit

Per time period:

- daily
- monthly
- yearly

## Required surfaces

### Accounts page

Shows:

- all managed accounts
- stock count per account
- listings in review / ready / listed
- sales and profit summaries

### Stock page

Shows:

- assigned account
- SKU
- location
- cost basis
- current listing state

### Orders page

Shows:

- sold items
- order status
- sale amount
- account used

### Profit page

Shows:

- revenue
- costs
- profit
- margin
- per-account comparisons
- export actions

## Scope guardrails

Build:

- seller ops finance
- simple P&L
- CSV export

Do not build yet:

- full bookkeeping
- tax engine
- invoice platform
- legal accounting system

## Success criteria

This layer is successful when:

- seller can assign stock to specific accounts
- seller can see what sold on which account
- seller can track profit per item and per account
- seller can export the data cleanly
