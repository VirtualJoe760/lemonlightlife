import mongoose from "mongoose";

const SpecializationSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    level: { type: Number, required: true, min: 1, max: 5 },
    yearsInSpecialty: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: (v) => Array.isArray(v) && v.length === 2,
    },
  },
  { _id: false }
);

const SubcontractorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    headshotUrl: { type: String, default: null },
    roles: { type: [String], required: true, index: true },
    specializations: { type: [SpecializationSchema], default: [] },
    yearsExperience: { type: Number, required: true, min: 0, max: 60 },
    city: { type: String, required: true },
    county: { type: String, required: true },
    state: { type: String, required: true, default: "CA" },
    location: { type: PointSchema, required: true },
    hourlyRate: { type: Number, required: true, min: 15, max: 250 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    certifications: { type: [String], default: [] },
    bookingStatus: {
      type: String,
      enum: ["available", "booked", "unavailable"],
      required: true,
      index: true,
    },
    bio: { type: String, required: true },
  },
  { timestamps: true, collection: "subcontractors" }
);

SubcontractorSchema.index({ location: "2dsphere" });

export const Subcontractor =
  mongoose.models.Subcontractor ||
  mongoose.model("Subcontractor", SubcontractorSchema);
