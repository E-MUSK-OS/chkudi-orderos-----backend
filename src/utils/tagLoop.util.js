// ======================================
// Parse Tag
// ======================================

export const parseTag = (tag) => {
  const match = tag.match(/^([A-Za-z]+)(\d+)$/);

  if (!match) {
    throw new Error("Invalid TAG format.");
  }

  return {
    prefix: match[1],
    number: Number(match[2]),
  };
};

// ======================================
// Generate End Tag
// ======================================

export const generateEndTag = ({ prefix, startNumber, total }) => {
  const endNumber = startNumber + total - 1;

  return {
    endNumber,
    endTag: `${prefix}${endNumber}`,
  };
};

// ======================================
// Generate All Tags
// ======================================

export const generateTags = ({
  prefix,
  startNumber,
  endNumber,
  loopId,
  userId,
}) => {
  const tags = [];

  for (let i = startNumber; i <= endNumber; i++) {
    tags.push({
      tagNumber: `${prefix}${i}`,
      loopId,
      userId,
    });
  }

  return tags;
};