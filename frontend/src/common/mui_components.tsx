import React from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  ListItemText,
} from '@mui/material';
import { ArrowDropDown } from '@mui/icons-material';
import {
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
} from '@mui/x-data-grid';
import { useGridApiContext, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { SxProps, Theme } from '@mui/material/styles';

// === STYLES ===

export const toolbarContainer: SxProps<Theme> = {
  py: 1,
  gap: 2,
  justifyContent: 'flex-start',
};

export const columnsButton: SxProps<Theme> = {
  color: '#1976d2',
  fontWeight: 500,
  textTransform: 'none',
  '&:hover': {
    backgroundColor: 'rgba(25, 118, 210, 0.08)',
  },
};

export const columnMenuPaper: SxProps<Theme> = {
  minWidth: 220,
  mt: 0.5,
};

export const dataGridHeader: SxProps<Theme> = {
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: '#f5f5f5',
  },
};

export const pageContainer: SxProps<Theme> = {
  p: 3,
};

export const headerSection: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  mb: 3,
};

export const dialogGrid: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
  mt: 1,
};

export const dialogOuterPadding: SxProps<Theme> = {
  '& .MuiDialogTitle-root': {
    pt: 4,
    pb: 2,
  },
  '& .MuiDialogContent-root': {
    pb: 3,
  },
  '& .MuiDialogActions-root': {
    pb: 4,
    pt: 2,
  },
};

// ===REUSABLE COMPONENTS ===

const CustomColumnsButton: React.FC<{ onClick: (event: React.MouseEvent<HTMLButtonElement>) => void }> = ({ onClick }) => (
  <Button size="small" onClick={onClick} endIcon={<ArrowDropDown />} sx={columnsButton}>
    COLUMNS
  </Button>
);

export const CustomColumnsMenu: React.FC<{
  columnVisibilityModel: GridColumnVisibilityModel;
  setColumnVisibilityModel: (model: GridColumnVisibilityModel) => void;
  optionalColumns?: readonly string[];
}> = ({ columnVisibilityModel, setColumnVisibilityModel, optionalColumns = [] }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const apiRef = useGridApiContext();
  const allColumns = apiRef.current.getAllColumns();

  // Use local state for visibility checks
  const visibilityModel = columnVisibilityModel;

  const columnsToToggle = optionalColumns.length > 0
    ? optionalColumns
    : allColumns.map(col => col.field).filter(field => field !== 'actions');

  const allOptionalVisible = columnsToToggle.every(field => columnVisibilityModel[field] !== false);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleMasterToggle = () => {
    const newModel: GridColumnVisibilityModel = { ...columnVisibilityModel };
    const show = !allOptionalVisible;
    columnsToToggle.forEach(field => {
      newModel[field] = show;
    });
    setColumnVisibilityModel(newModel);
  };

  const handleToggleColumn = (field: string) => () => {
    setColumnVisibilityModel({
      ...columnVisibilityModel,
      [field]: !columnVisibilityModel[field],
    });
  };

  return (
    <>
      <CustomColumnsButton onClick={handleOpen} />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{ sx: columnMenuPaper }}
      >
        <MenuItem dense disableRipple sx={{ py: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <FormControlLabel
            control={
              <Switch
                checked={allOptionalVisible}
                onChange={handleMasterToggle}
                onClick={(e) => e.stopPropagation()} 
                size="small"
                sx={{ mr: 1 }}
              />
            }
            label="Show All Columns"
            sx={{ m: 0, width: '100%' }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {allColumns.map((column) => {
          if (column.field === 'actions') return null;
          const visible = visibilityModel[column.field] !== false;
          return (
            <MenuItem
              key={column.field}
              dense
              onClick={handleToggleColumn(column.field)}
              sx={{ py: 0.5 }}
            >
              <Switch
                checked={visible}
                size="small"
                sx={{ mr: 1 }}
              />
              <ListItemText primary={column.headerName || column.field} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export const CustomToolbar: React.FC<{
  columnVisibilityModel: GridColumnVisibilityModel;
  setColumnVisibilityModel: (model: GridColumnVisibilityModel) => void;
  optionalColumns?: readonly string[];
}> = ({ columnVisibilityModel, setColumnVisibilityModel, optionalColumns }) => (
  <GridToolbarContainer sx={toolbarContainer as any}>
    <CustomColumnsMenu
      columnVisibilityModel={columnVisibilityModel}
      setColumnVisibilityModel={setColumnVisibilityModel}
      optionalColumns={optionalColumns}
    />
    <GridToolbarFilterButton />
    <GridToolbarDensitySelector />
  </GridToolbarContainer>
);