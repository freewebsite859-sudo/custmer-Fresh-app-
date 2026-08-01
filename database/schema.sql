-- Nexora Fresh App Database Schema
-- Tables: profiles, salons, services, staff, bookings, booking_items, favorite_salons, favorite_services, favorite_staff, rewards, payments

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  photo_url TEXT,
  preferred_city TEXT,
  preferred_area TEXT,
  gender TEXT,
  date_of_birth DATE,
  platform_role TEXT DEFAULT 'customer',
  is_active BOOLEAN DEFAULT true,
  recently_viewed TEXT[],
  loyalty_points INTEGER DEFAULT 0,
  wallet_balance_paise INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  business_category TEXT,
  gender_category TEXT,
  phone TEXT,
  address TEXT,
  area TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  price_paise INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_bookable_online BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Stylist',
  avatar TEXT,
  rating DOUBLE PRECISION DEFAULT 0,
  reviews_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  appointment_start TIMESTAMP WITH TIME ZONE NOT NULL,
  appointment_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'PENDING',
  total_paise INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  customer_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(booking_id, service_id)
);

CREATE TABLE IF NOT EXISTS favorite_salons (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, salon_id)
);

CREATE TABLE IF NOT EXISTS favorite_services (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, service_id)
);

CREATE TABLE IF NOT EXISTS favorite_staff (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, staff_id)
);

CREATE TABLE IF NOT EXISTS rewards (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  tier_text TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id)
);
