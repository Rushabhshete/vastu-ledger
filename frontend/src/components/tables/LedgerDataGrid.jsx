import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";

export function LedgerDataGrid({
  rows = [],
  columns = [],
  loading = false,
  pageSize = 10,
  autoHeight = true,
  onRowClick,
  className = "",
}) {
  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        "& .MuiDataGrid-root": {
          border: "none",
        },
      }}
      className={className}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        initialState={{
          pagination: {
            paginationModel: { pageSize, page: 0 },
          },
        }}
        pageSizeOptions={[5, 10, 25, 50]}
        disableRowSelectionOnClick
        autoHeight={autoHeight}
        onRowClick={onRowClick}
        sx={{
          "& .MuiDataGrid-cell:focus": {
            outline: "none",
          },
          "& .MuiDataGrid-columnHeader:focus": {
            outline: "none",
          },
        }}
      />
    </Box>
  );
}

export default LedgerDataGrid;
