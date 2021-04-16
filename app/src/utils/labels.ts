export const VALID_OBJECT_TYPES = [
  "Detection",
  "Detections",
  "Keypoint",
  "Keypoints",
  "Polyline",
  "Polylines",
];
export const VALID_CLASS_TYPES = ["Classification", "Classifications"];
export const VALID_MASK_TYPES = ["Segmentation"];
export const VALID_LIST_TYPES = [
  "Classifications",
  "Detections",
  "Keypoints",
  "Polylines",
];
export const VALID_LABEL_TYPES = [
  ...VALID_CLASS_TYPES,
  ...VALID_OBJECT_TYPES,
  ...VALID_MASK_TYPES,
];

export const HIDDEN_LABEL_ATTRS = {
  Classification: ["logits"],
  Detection: ["bounding_box", "attributes", "mask"],
  Polyline: ["points", "attributes"],
  Keypoint: ["points", "attributes"],
  Segmentation: ["mask"],
};

export const OBJECT_TYPES = [
  "Detection",
  "Detections",
  "Keypoints",
  "Keypoint",
  "Polylines",
  "Polyline",
];

export const FILTERABLE_TYPES = [
  "Classification",
  "Classifications",
  "Detection",
  "Detections",
  "Keypoints",
  "Keypoint",
  "Polylines",
  "Polyline",
];

export const CONFIDENCE_LABELS = [
  "Classification",
  "Classifications",
  "Detection",
  "Detections",
  "Keypoint",
  "Keypoints",
  "Polyline",
  "Polylines",
];

export const LABEL_LISTS = [
  "Classifications",
  "Detections",
  "Keypoints",
  "Polylines",
];

export const LABEL_LIST = {
  Classifications: "classifications",
  Detections: "detections",
  Keypoints: "keypoints",
  Polylines: "polylines",
};

export const AGGS = {
  BOUNDS: "Bounds",
  COUNT: "Count",
  DISTINCT: "Distinct",
};

export const BOOLEAN_FIELD = "fiftyone.core.fields.BooleanField";
export const FLOAT_FIELD = "fiftyone.core.fields.FloatField";
export const INT_FIELD = "fiftyone.core.fields.IntField";
export const STRING_FIELD = "fiftyone.core.fields.StringField";

export const VALID_SCALAR_TYPES = [
  BOOLEAN_FIELD,
  FLOAT_FIELD,
  INT_FIELD,
  STRING_FIELD,
];

export const VALID_NUMERIC_TYPES = [FLOAT_FIELD, INT_FIELD];

export const RESERVED_FIELDS = [
  "_id",
  "_rand",
  "_media_type",
  "metadata",
  "tags",
  "filepath",
  "frames",
  "frame_number",
];
export const RESERVED_DETECTION_FIELDS = [
  "label",
  "index",
  "bounding_box",
  "confidence",
  "attributes",
  "mask",
  "target",
];

export const METADATA_FIELDS = [
  { name: "Size (bytes)", key: "size_bytes" },
  { name: "Type", key: "mime_type" },
  { name: "Media type", key: "_media_type" },
  {
    name: "Dimensions",
    value: (metadata) => {
      if (!isNaN(metadata.width) && !isNaN(metadata.height)) {
        return `${metadata.width} x ${metadata.height}`;
      }
    },
  },
  { name: "Channels", key: "num_channels" },
];

export const stringify = (value) => {
  if (typeof value == "number") {
    value = Number(value.toFixed(3));
  }
  return String(value);
};

export const labelTypeHasColor = (labelType) => {
  return !VALID_MASK_TYPES.includes(labelType);
};

export const labelTypeIsFilterable = (labelType) => {
  return FILTERABLE_TYPES.includes(labelType);
};

export const getLabelText = (label) => {
  if (
    !label._cls ||
    !(
      VALID_LABEL_TYPES.includes(label._cls) ||
      VALID_SCALAR_TYPES.includes(label._cls)
    ) ||
    VALID_OBJECT_TYPES.includes(label._cls)
  ) {
    return undefined;
  }
  let value = undefined;
  for (const prop of ["label", "value"]) {
    if (label.hasOwnProperty(prop)) {
      value = label[prop];
      break;
    }
  }
  if (value === undefined) {
    return undefined;
  }
  return stringify(value);
};

export const formatMetadata = (metadata) => {
  if (!metadata) {
    return [];
  }
  return METADATA_FIELDS.map((field) => ({
    name: field.name,
    value: field.value ? field.value(metadata) : metadata[field.key],
  })).filter(({ value }) => value !== undefined);
};

export function makeLabelNameGroups(fieldSchema, labelNames, labelTypes) {
  const labelNameGroups = {
    labels: [],
    scalars: [],
    unsupported: [],
  };

  for (let i = 0; i < labelNames.length; i++) {
    const name = labelNames[i];
    const type = labelTypes[i];
    if (VALID_LABEL_TYPES.includes(type)) {
      labelNameGroups.labels.push({ name, type });
    }
  }
  for (const field in fieldSchema) {
    if (RESERVED_FIELDS.includes(field)) {
      continue;
    } else if (labelNames.includes(field)) {
      continue;
    } else if (VALID_SCALAR_TYPES.includes(fieldSchema[field].ftype)) {
      labelNameGroups.scalars.push({ name: field });
    } else {
      labelNameGroups.unsupported.push({ name: field });
    }
  }
  return labelNameGroups;
}

export type Attrs = {
  [name: string]: {
    name: string;
    value: string;
  };
};

const _formatAttributes = (obj) =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(
        ([key, value]) =>
          !key.startsWith("_") &&
          !RESERVED_DETECTION_FIELDS.includes(key) &&
          ["string", "number", "boolean"].includes(typeof value)
      )
      .map(([key, value]) => [key, stringify(value)])
  );

export const getDetectionAttributes = (detection: object): Attrs => {
  return {
    ..._formatAttributes(detection),
    ..._formatAttributes(
      Object.fromEntries(
        Object.entries(detection.attributes).map(([key, value]) => [
          key,
          value.value,
        ])
      )
    ),
  };
};
