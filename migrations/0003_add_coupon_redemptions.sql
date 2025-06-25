
CREATE TABLE coupon_redemptions (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  validation_code VARCHAR(20) NOT NULL UNIQUE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  used_by_store_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupon_redemptions_validation_code ON coupon_redemptions(validation_code);
CREATE INDEX idx_coupon_redemptions_coupon_id ON coupon_redemptions(coupon_id);
