# GoodGather

GoodGather is a community food-rescue coordination demo. Local markets, restaurants, and farms can post surplus food for pickup; pantries, shelters, and food-bank drivers can claim a listing and move it through pickup and delivery.

## Run locally

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set `PORT` to use a different port.

## Features

- Browse and filter seeded neighborhood food listings by category and status.
- Refresh the shared board every 10 seconds to pick up listings and status changes from other participants.
- Post new food, quantity, estimated weight and meals, donor, address, and pickup window.
- Claim food for a receiving organization and advance its status from **Available** to **Claimed**, **In Transit**, and **Delivered**.
- See live demo metrics for delivered meals, distributed weight, estimated CO₂ avoided, and food ready to rescue.

The demo uses in-memory data seeded by the server, so new listings and status changes reset when the server restarts. Impact metrics are illustrative: food weight is multiplied by 2.5 to estimate pounds of CO₂ avoided. This prototype does not provide user authentication, persistent storage, food-safety verification, maps, or GPS tracking.
