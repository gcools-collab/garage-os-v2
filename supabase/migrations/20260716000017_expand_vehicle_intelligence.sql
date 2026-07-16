alter table public.vehicles
add column vin text,
add column registration_number text,
add column color text,
add column doors smallint,
add column seats smallint,
add column power_din integer,
add column fiscal_power integer,
add column co2_emissions integer,
add column crit_air smallint,
add column euro_standard text,
add column trim text,
add column engine text,
add column transmission text,
add column owners_count smallint,
add column first_registration_date date;

alter table public.vehicles
add constraint vehicles_vin_format_check
  check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
add constraint vehicles_registration_number_length_check
  check (
    registration_number is null
    or char_length(registration_number) between 2 and 20
  ),
add constraint vehicles_year_check
  check (year is null or year between 1886 and 2100),
add constraint vehicles_mileage_check
  check (mileage is null or mileage >= 0),
add constraint vehicles_doors_check
  check (doors is null or doors between 2 and 6),
add constraint vehicles_seats_check
  check (seats is null or seats between 1 and 9),
add constraint vehicles_power_din_check
  check (power_din is null or power_din between 0 and 3000),
add constraint vehicles_fiscal_power_check
  check (fiscal_power is null or fiscal_power between 0 and 1000),
add constraint vehicles_co2_emissions_check
  check (co2_emissions is null or co2_emissions between 0 and 1000),
add constraint vehicles_crit_air_check
  check (crit_air is null or crit_air between 0 and 5),
add constraint vehicles_owners_count_check
  check (owners_count is null or owners_count between 0 and 99),
add constraint vehicles_first_registration_date_check
  check (
    first_registration_date is null
    or first_registration_date >= date '1886-01-29'
  );

create unique index vehicles_garage_vin_unique
on public.vehicles (garage_id, vin)
where vin is not null;

create index vehicles_registration_number_idx
on public.vehicles (registration_number)
where registration_number is not null;

create index vehicles_intelligence_matching_idx
on public.vehicles (brand, model, year, fuel, gearbox);
