-- CreateEnum
CREATE TYPE "FareCode" AS ENUM ('SAVER', 'FLEXI', 'BUSINESS');

-- CreateEnum
CREATE TYPE "Cabin" AS ENUM ('ECONOMY', 'BUSINESS');

-- CreateTable
CREATE TABLE "airlines" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "airlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airports" (
    "id" UUID NOT NULL,
    "iata" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "destinationId" UUID,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flights" (
    "id" UUID NOT NULL,
    "airlineId" UUID NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "originId" UUID NOT NULL,
    "destinationId" UUID NOT NULL,
    "departureMinute" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "aircraft" TEXT NOT NULL,
    "daysOfWeek" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "flights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fare_classes" (
    "id" UUID NOT NULL,
    "flightId" UUID NOT NULL,
    "code" "FareCode" NOT NULL,
    "name" TEXT NOT NULL,
    "cabin" "Cabin" NOT NULL,
    "checkinBaggageKg" INTEGER NOT NULL,
    "cabinBaggageKg" INTEGER NOT NULL,
    "mealIncluded" BOOLEAN NOT NULL DEFAULT false,
    "seatSelectionIncluded" BOOLEAN NOT NULL DEFAULT false,
    "supplementBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "discountBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "cancellationPolicyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fare_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_inventory" (
    "id" UUID NOT NULL,
    "flightId" UUID NOT NULL,
    "fareClassId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "seatsOpen" INTEGER NOT NULL,
    "baseFareMinor" INTEGER NOT NULL,

    CONSTRAINT "flight_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_quotes" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "flightId" UUID NOT NULL,
    "fareClassId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flight_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_bookings" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "flightId" UUID NOT NULL,
    "fareClassId" UUID NOT NULL,
    "quoteId" UUID,
    "travelDate" DATE NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalMinor" INTEGER NOT NULL,
    "refundMinor" INTEGER,
    "priceSnapshot" JSONB NOT NULL,
    "cancellationPolicySnapshot" JSONB NOT NULL,
    "flightSnapshot" JSONB NOT NULL,
    "fareName" TEXT NOT NULL,
    "cabin" "Cabin" NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "paymentDeadline" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flight_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_passengers" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isLeadPassenger" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "flight_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_payment_attempts" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "scenario" "PaymentScenario" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "failureReason" TEXT,
    "simulatorRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "flight_payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_booking_status_events" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "note" TEXT,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flight_booking_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_refunds" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "status" "RefundStatus" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "penaltyMinor" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "flight_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airlines_code_key" ON "airlines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "airports_iata_key" ON "airports"("iata");

-- CreateIndex
CREATE INDEX "flights_originId_destinationId_idx" ON "flights"("originId", "destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "flights_airlineId_flightNumber_key" ON "flights"("airlineId", "flightNumber");

-- CreateIndex
CREATE UNIQUE INDEX "fare_classes_flightId_code_key" ON "fare_classes"("flightId", "code");

-- CreateIndex
CREATE INDEX "flight_inventory_date_idx" ON "flight_inventory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "flight_inventory_flightId_fareClassId_date_key" ON "flight_inventory"("flightId", "fareClassId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "flight_bookings_reference_key" ON "flight_bookings"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "flight_bookings_quoteId_key" ON "flight_bookings"("quoteId");

-- CreateIndex
CREATE INDEX "flight_bookings_userId_createdAt_idx" ON "flight_bookings"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "flight_passengers_bookingId_idx" ON "flight_passengers"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "flight_payment_attempts_idempotencyKey_key" ON "flight_payment_attempts"("idempotencyKey");

-- CreateIndex
CREATE INDEX "flight_payment_attempts_bookingId_createdAt_idx" ON "flight_payment_attempts"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "flight_booking_status_events_bookingId_createdAt_idx" ON "flight_booking_status_events"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "flight_refunds_bookingId_key" ON "flight_refunds"("bookingId");

-- AddForeignKey
ALTER TABLE "airports" ADD CONSTRAINT "airports_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_originId_fkey" FOREIGN KEY ("originId") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_classes" ADD CONSTRAINT "fare_classes_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "flights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_classes" ADD CONSTRAINT "fare_classes_cancellationPolicyId_fkey" FOREIGN KEY ("cancellationPolicyId") REFERENCES "cancellation_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_inventory" ADD CONSTRAINT "flight_inventory_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "flights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_inventory" ADD CONSTRAINT "flight_inventory_fareClassId_fkey" FOREIGN KEY ("fareClassId") REFERENCES "fare_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_quotes" ADD CONSTRAINT "flight_quotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_quotes" ADD CONSTRAINT "flight_quotes_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "flights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_quotes" ADD CONSTRAINT "flight_quotes_fareClassId_fkey" FOREIGN KEY ("fareClassId") REFERENCES "fare_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_bookings" ADD CONSTRAINT "flight_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_bookings" ADD CONSTRAINT "flight_bookings_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "flights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_bookings" ADD CONSTRAINT "flight_bookings_fareClassId_fkey" FOREIGN KEY ("fareClassId") REFERENCES "fare_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_bookings" ADD CONSTRAINT "flight_bookings_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "flight_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_passengers" ADD CONSTRAINT "flight_passengers_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "flight_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_payment_attempts" ADD CONSTRAINT "flight_payment_attempts_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "flight_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_booking_status_events" ADD CONSTRAINT "flight_booking_status_events_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "flight_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_booking_status_events" ADD CONSTRAINT "flight_booking_status_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_refunds" ADD CONSTRAINT "flight_refunds_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "flight_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
