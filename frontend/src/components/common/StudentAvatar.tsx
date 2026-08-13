import React, { useState } from 'react';
import { getProfileImageUrl } from '../../utils/imageUrl';

interface StudentAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  fallbackClassName?: string;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  src,
  name = 'Student',
  className = 'h-10 w-10 rounded-full object-cover border border-slate-200',
  fallbackClassName = 'h-10 w-10 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center border border-slate-700'
}) => {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = getProfileImageUrl(src);

  const getInitials = (n: string) => {
    if (!n) return 'ST';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        className={className}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={fallbackClassName}>
      {getInitials(name)}
    </div>
  );
};

export default StudentAvatar;
