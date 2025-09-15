package com.qbrain.smartwaste.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.qbrain.smartwaste.databinding.ItemRouteStopBinding

class RouteStopsAdapter(
    private val stops: List<String>,
    private val onStopClick: (String) -> Unit
) : RecyclerView.Adapter<RouteStopsAdapter.StopViewHolder>() {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StopViewHolder {
        val binding = ItemRouteStopBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return StopViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: StopViewHolder, position: Int) {
        holder.bind(stops[position], position + 1)
    }
    
    override fun getItemCount(): Int = stops.size
    
    inner class StopViewHolder(private val binding: ItemRouteStopBinding) :
        RecyclerView.ViewHolder(binding.root) {
        
        fun bind(binId: String, stopNumber: Int) {
            binding.apply {
                tvStopNumber.text = stopNumber.toString()
                tvBinId.text = "Bin $binId"
                
                root.setOnClickListener {
                    onStopClick(binId)
                }
            }
        }
    }
}